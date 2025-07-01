# Claude Code Testing with Fixed lsmcp - CORRECTED SETUP

## ✅ **Proper Setup Complete**

This project now has the **fixed version of lsmcp** correctly configured for Claude Code testing using the official CLI method.

## 🔧 **Correct Configuration**

### MCP Server Registration
```bash
# ✅ CORRECT METHOD (completed):
claude mcp add -s local lsmcp-fixed-csharp -- node ./lsmcp/dist/generic-lsp-mcp.js --lsp-command=csharp-ls

# ❌ WRONG METHOD (removed):
# Manual .claude/settings.json configuration
```

### Verification Commands
```bash
claude mcp list                      # Shows: lsmcp-fixed-csharp registered
claude mcp get lsmcp-fixed-csharp    # Shows: Local scope, stdio transport
```

**Server Details:**
- **Name**: `lsmcp-fixed-csharp`
- **Scope**: Local (private to you in this project)
- **Type**: stdio transport
- **Command**: `node ./lsmcp/dist/generic-lsp-mcp.js --lsp-command=csharp-ls`

## 🧪 **Testing the C# Fixes**

### **How to Test**
1. **Open Claude Code** in this project directory
2. **Type `/mcp`** to see MCP status panel
3. **Use the fixed lsmcp tools** below

### **Fix 1: Parameter Consistency**
Test both parameter naming conventions:

```
Ask Claude: "Use lsmcp_find_references to find references to Add method on line 13 of Program.cs with target parameter"

Ask Claude: "Use lsmcp_find_references to find references to Add method on line 13 of Program.cs with symbolName parameter"
```

**Expected**: Both should work (before: only symbolName worked)

### **Fix 2: Extended C# Timeouts** 
Test operations that previously timed out:

```
Ask Claude: "Use lsmcp_get_document_symbols to get all symbols in Program.cs"

Ask Claude: "Use lsmcp_get_hover to get hover info for Calculator class on line 7 of Program.cs"
```

**Expected**: Should complete in 60s/45s/15s (before: failed at 30s)

### **Fix 3: Language Detection**
```
Ask Claude: "Use lsmcp_list_tools to show available tools"
```

**Expected**: Should show "C#" language detected (before: "your language")

### **Fix 4: C# File Handling**
```
Ask Claude: "Use lsmcp_get_hover to get information about Calculator class in Program.cs"
```

**Expected**: Should work with 3-second wait for C# indexing (before: immediate failure)

## 📂 **Available Test Files**

- `Program.cs` - Main C# file with Calculator class
- `TestProject.csproj` - C# project configuration
- **Classes**: Calculator, Program
- **Methods**: Add, Subtract, Main (static)

## 🎯 **Available lsmcp Tools**

All tools should be auto-discoverable by Claude Code:
- `lsmcp_find_references` - Find symbol references
- `lsmcp_get_hover` - Get hover information
- `lsmcp_get_definitions` - Go to definitions  
- `lsmcp_get_document_symbols` - List document symbols
- `lsmcp_get_workspace_symbols` - Search workspace symbols
- `lsmcp_get_diagnostics` - Get errors/warnings
- `lsmcp_get_completion` - Code completion
- `lsmcp_rename_symbol` - Rename symbols
- `lsmcp_format_document` - Format code
- `lsmcp_get_code_actions` - Get available code actions
- `lsmcp_get_signature_help` - Get method signatures
- `lsmcp_list_tools` - List available tools

## 📊 **Success Metrics**

Compare before/after results:

**Before fixes (with original lsmcp):**
- ❌ "Invalid arguments: symbolName required" 
- ❌ "Request timed out after 30 seconds"
- ❌ Language: "your language"
- ❌ Symbol resolution failures

**After fixes (with lsmcp-fixed-csharp):**
- ✅ Both `target` and `symbolName` parameters work
- ✅ Extended timeouts: 60s/45s/15s for C# operations
- ✅ Proper "C#" language detection  
- ✅ Improved symbol resolution with wait times

## 🚀 **Ready to Test!**

The setup is complete. Simply:
1. **Use Claude Code** in this project
2. **Ask Claude to use the lsmcp tools** listed above
3. **Compare results** with the expected behavior

**Note**: This tests our locally modified lsmcp with all C# language server fixes applied to the source code.