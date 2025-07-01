# lsmcp Fixes for C# Language Server Support

## 🎯 Overview

This document details the issues found when integrating `csharp-ls` with `lsmcp` and proposed fixes to improve compatibility with C# language servers.

## ✅ What's Working

- ✅ **MCP Protocol**: Client-server communication works correctly
- ✅ **LSP Bridge**: lsmcp successfully bridges LSP to MCP protocol  
- ✅ **Tool Registration**: All 13 LSP tools are properly registered
- ✅ **Server Initialization**: `csharp-ls` initializes and connects successfully
- ✅ **Basic Diagnostics**: Returns results (though may need file opening)

## ❌ Issues Found

### 1. **Symbol Finding Problems**

**Issue**: `Symbol "Calculator" not found on line 6`

**Root Cause**: 
- C# classes need proper file indexing before symbol lookup
- LSP server might need the file to be "opened" first
- Line numbering might be 0-based vs 1-based mismatch

**Proposed Fix in `lspGetHover.ts`:**
```typescript
// Before getting hover, ensure document is opened and give LSP time to index
async function getHover(request: GetHoverRequest): Promise<Result<GetHoverSuccess, string>> {
  try {
    const client = getActiveClient();
    const absolutePath = path.resolve(request.root, request.filePath);
    const fileContent = readFileSync(absolutePath, "utf-8");
    const fileUri = `file://${absolutePath}`;

    // ENHANCEMENT: Open document and wait longer for C# indexing
    client.openDocument(fileUri, fileContent);
    
    // ENHANCEMENT: Increase wait time for C# language servers
    await new Promise<void>((resolve) => setTimeout(resolve, 3000)); // Was 1000ms
    
    // ENHANCEMENT: Add retry mechanism
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const result = await client.getHover(fileUri, {
          line: targetLine,
          character: symbolPosition,
        });
        
        if (result) {
          return formatHoverResult(result, request, targetLine, symbolPosition);
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // ... rest of existing code
  }
}
```

### 2. **Timeout Issues**

**Issue**: `Operation timed out` for document symbols

**Root Cause**:
- C# language servers are slower than TypeScript
- Default timeout (30s) might be insufficient for large C# projects
- MSBuild project loading takes time

**Proposed Fix in `lspClient.ts`:**
```typescript
// In sendRequest function, add language-specific timeouts
function sendRequest<T = unknown>(method: string, params?: unknown): Promise<T> {
  const id = ++state.messageId;
  
  // ENHANCEMENT: Language-specific timeouts
  const getTimeout = () => {
    if (state.languageId === 'csharp' || state.languageId === 'c#') {
      if (method === 'textDocument/documentSymbol') return 60000; // 60s for symbols
      if (method === 'textDocument/references') return 45000;     // 45s for references
      return 45000; // 45s default for C#
    }
    return 30000; // 30s default for other languages
  };

  const timeout = setTimeout(() => {
    state.responseHandlers.delete(id);
    const context: ErrorContext = {
      operation: method,
      language: state.languageId,
      details: { method, params, timeoutMs: getTimeout() },
    };
    reject(
      new Error(
        formatError(
          new Error(`Request '${method}' timed out after ${getTimeout()/1000} seconds`),
          context,
        ),
      ),
    );
  }, getTimeout());
  
  // ... rest of existing code
}
```

### 3. **Parameter Name Inconsistency**

**Issue**: `Invalid arguments for tool lsmcp_find_references: symbolName required`

**Root Cause**:
- Tool expects `symbolName` parameter
- Test code uses `target` parameter  
- Inconsistent parameter naming across tools

**Proposed Fix in `lspFindReferences.ts`:**
```typescript
const schema = z.object({
  root: z.string().describe("Root directory for resolving relative paths"),
  filePath: z.string().describe("File path containing the symbol (relative to root)"),
  line: z.union([z.number(), z.string()]).describe("Line number (1-based) or string to match in the line").optional(),
  character: z.number().describe("Character position in the line (0-based)").optional(),
  
  // ENHANCEMENT: Accept both 'target' and 'symbolName' for consistency
  target: z.string().describe("Symbol name to find references for").optional(),
  symbolName: z.string().describe("Symbol name to find references for").optional(),
}).refine(
  (data) => data.target || data.symbolName,
  {
    message: "Either 'target' or 'symbolName' must be provided",
    path: ["target", "symbolName"],
  }
);

// In the execute function:
async function findReferences(request: FindReferencesRequest): Promise<Result<FindReferencesSuccess, string>> {
  // ENHANCEMENT: Support both parameter names
  const symbolName = request.symbolName || request.target;
  if (!symbolName) {
    return err("Either 'symbolName' or 'target' parameter is required");
  }
  
  // ... rest of function using symbolName
}
```

### 4. **Language Detection Enhancement**

**Issue**: Language detected as "your language" instead of "csharp"

**Proposed Fix in `languageSupport.ts`:**
```typescript
export function getLanguageFromLSPCommand(lspCommand: string): string {
  const command = lspCommand.toLowerCase();
  
  // ENHANCEMENT: Better C# detection
  if (command.includes('csharp-ls') || command.includes('csharp_ls')) {
    return 'csharp';
  }
  if (command.includes('omnisharp')) {
    return 'csharp';
  }
  
  // Existing mappings...
  if (command.includes('rust-analyzer')) return 'rust';
  if (command.includes('pylsp') || command.includes('pyright')) return 'python';
  // ... rest of existing code
}
```

### 5. **C# File Opening Strategy**

**Issue**: LSP tools may fail if files aren't properly opened

**Proposed Enhancement in `generic-lsp-mcp.ts`:**
```typescript
// ENHANCEMENT: Add C#-specific initialization
async function initializeCSharpProject(projectRoot: string, client: LSPClient) {
  // Find and open all C# files to trigger indexing
  const csharpFiles = await glob('**/*.cs', { cwd: projectRoot });
  
  for (const file of csharpFiles.slice(0, 10)) { // Limit to first 10 files
    try {
      const filePath = path.resolve(projectRoot, file);
      const content = readFileSync(filePath, 'utf-8');
      const uri = `file://${filePath}`;
      
      client.openDocument(uri, content);
      await new Promise(resolve => setTimeout(resolve, 100)); // Throttle
    } catch (error) {
      // Ignore file read errors
    }
  }
  
  // Wait for initial indexing
  await new Promise(resolve => setTimeout(resolve, 5000));
}

// In main function:
if (detectedLanguage.toLowerCase() === 'csharp') {
  await initializeCSharpProject(projectRoot, activeClient);
}
```

## 🔧 Testing Improvements

### Enhanced Test Configuration

**Create `test-csharp-mcp.js` with proper parameters:**
```javascript
// Corrected test calls
const hoverResult = await client.callTool({
  name: 'lsmcp_get_hover',
  arguments: {
    root: this.projectRoot,
    filePath: 'Program.cs',
    line: 7, // Try line 7 instead of 6 (class declaration line)
    target: 'Calculator'
  }
});

const referencesResult = await client.callTool({
  name: 'lsmcp_find_references',
  arguments: {
    root: this.projectRoot,
    filePath: 'Program.cs',
    line: 13,
    symbolName: 'Add' // Use symbolName, not target
  }
});
```

## 📋 Priority Fix List

1. **High Priority**:
   - Fix parameter name inconsistency (`target` vs `symbolName`)
   - Increase timeouts for C# language servers
   - Improve language detection for csharp-ls

2. **Medium Priority**: 
   - Add retry mechanism for symbol lookup
   - Implement C# project pre-indexing
   - Better error messages for C# specific issues

3. **Low Priority**:
   - Add C# specific documentation
   - Performance optimizations for large C# projects

## 🧪 Validation Plan

After implementing fixes:

1. **Test Symbol Resolution**: Verify Calculator class can be found
2. **Test All LSP Features**: Hover, references, symbols, completion
3. **Test Different C# Constructs**: Classes, methods, properties, enums
4. **Performance Testing**: Large C# projects with multiple files
5. **Error Handling**: Non-existent symbols, invalid files

## 📝 Additional Notes

- Consider adding `csharp-ls` to the officially supported language servers list
- Document C# specific setup requirements
- Add example C# project in lsmcp repository
- Consider creating C# specific timeout configurations

---

**Result**: These fixes would make lsmcp a robust bridge for C# language servers, enabling AI assistants to work effectively with C# codebases through LSP protocol.