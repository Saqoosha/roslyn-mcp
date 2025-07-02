# Workspace Symbols Investigation Report

## 🎯 Problem Summary

**Issue**: Microsoft.CodeAnalysis.LanguageServer workspace symbols (`workspace/symbol` requests) return empty arrays, preventing "Go to Symbol in Workspace" functionality.

**Root Cause**: The language server operates in "miscellaneous files" mode instead of proper "solution mode", which disables workspace symbol indexing.

## 🔍 Investigation Process

### Phase 1: Direct Testing
- Tested workspace symbols directly via MCP bridge
- Confirmed document symbols work, workspace symbols don't
- Established the issue is specifically with workspace indexing, not general LSP functionality

### Phase 2: Source Code Analysis

#### 2.1 Roslyn Language Server Source Code (dotnet/roslyn)
**Key Files Examined:**
- `src/LanguageServer/Protocol/Handler/Symbols/WorkspaceSymbolsHandler.cs`
- `src/Features/Core/Portable/NavigateTo/NavigateToSearcher.cs`
- `src/LanguageServer/Microsoft.CodeAnalysis.LanguageServer/HostWorkspace/OpenSolutionHandler.cs`
- `src/LanguageServer/Microsoft.CodeAnalysis.LanguageServer/HostWorkspace/OpenProjectsHandler.cs`

**Critical Findings:**
1. **WorkspaceSymbolsHandler requires solution**: `RequiresLSPSolution => true` (line 48)
2. **Uses NavigateTo infrastructure**: Relies on `NavigateToSearcher.Create()` with `NavigateToSearchScope.Solution`
3. **Solution loading handlers exist**: 
   - `solution/open` notification handler (`OpenSolutionHandler`)
   - `project/open` notification handler (`OpenProjectHandler`)

#### 2.2 VS Code C# Extension Source Code (dotnet/vscode-csharp)
**Key Files Examined:**
- `src/lsptoolshost/server/roslynLanguageServer.ts`
- `src/lsptoolshost/server/roslynProtocol.ts`

**Critical Implementation Details:**
```typescript
// VS Code automatically sends solution/open after LSP initialization
private registerSendOpenSolution() {
    this._languageClient.onDidChangeState(async (state) => {
        if (state.newState === State.Running) {
            if (this._solutionFile || this._projectFiles.length > 0) {
                await this.sendOpenSolutionAndProjectsNotifications();
            }
        }
    });
}

// Exact notification format
await this._languageClient.sendNotification(RoslynProtocol.OpenSolutionNotification.type, {
    solution: protocolUri,  // DocumentUri format
});
```

**Protocol Specifications:**
- **Method**: `solution/open`
- **Parameters**: `{ solution: DocumentUri }`
- **Method**: `project/open` 
- **Parameters**: `{ projects: DocumentUri[] }`

### Phase 3: Direct LSP Testing
**Tests Performed:**
1. **test-solution-loading.js**: Confirmed Roslyn LSP starts but doesn't auto-discover solutions
2. **test-solution-opening.js**: Tested manual `solution/open` notification
3. **test-project-opening.js**: Tested manual `project/open` notification  
4. **test-vscode-approach.js**: Replicated exact VS Code C# extension approach

**Results**: All manual approaches failed, indicating our bridge layer needs the solution loading logic.

## 🎯 Root Cause Analysis

### The Problem
Microsoft.CodeAnalysis.LanguageServer has two operational modes:

1. **Miscellaneous Files Mode** (Current): 
   - Individual files opened via `textDocument/didOpen`
   - No project context or workspace indexing
   - Document symbols work, workspace symbols don't

2. **Solution Mode** (Required):
   - Solution/projects loaded via `solution/open` or `project/open` notifications
   - Full workspace indexing enabled
   - All symbol features work

### Why Workspace Symbols Fail
From Roslyn source analysis:
- `WorkspaceSymbolsHandler` requires `RequiresLSPSolution => true`
- Uses `NavigateToSearcher` with `NavigateToSearchScope.Solution`
- NavigateTo infrastructure needs proper MSBuild project context
- Without solution loading, the server has no symbols to index

## 💡 Solution Strategy

### Required Implementation
Our MCP server (`src/roslyn/mcp-server.ts`) needs to implement solution discovery and loading:

1. **Solution Discovery**: 
   - Scan project root for `.sln` files
   - Fallback to `.csproj` files if no solution found

2. **Automatic Solution Loading**:
   - Send `solution/open` notification after LSP initialization
   - Wait for project initialization complete
   - Handle initialization notifications

3. **State Management**:
   - Track solution loading state
   - Ensure workspace symbols only work after solution loads

### Implementation Plan
```typescript
class RoslynMCPServer {
    private async initializeLSP() {
        // 1. Initialize LSP as current
        await this.lspClient.start();
        
        // 2. Discover solution/projects
        const solutionFile = this.findSolutionFile();
        const projectFiles = this.findProjectFiles();
        
        // 3. Send solution/project loading notifications
        if (solutionFile) {
            await this.lspClient.sendNotification('solution/open', {
                solution: `file://${solutionFile}`
            });
        } else if (projectFiles.length > 0) {
            await this.lspClient.sendNotification('project/open', {
                projects: projectFiles.map(f => `file://${f}`)
            });
        }
        
        // 4. Wait for project initialization
        await this.waitForProjectInitialization();
    }
}
```

## 📚 Key Learnings

### About Microsoft.CodeAnalysis.LanguageServer
1. **Not a standalone C# language server**: Requires explicit project/solution loading
2. **Two-phase initialization**: LSP init + solution/project loading
3. **Rich notification system**: Many custom notifications beyond standard LSP
4. **Project-centric design**: Everything revolves around MSBuild projects/solutions

### About VS Code C# Extension Architecture
1. **Automatic solution discovery**: Scans workspace for .sln/.csproj files
2. **State-driven loading**: Waits for LSP running state before sending project notifications
3. **Comprehensive error handling**: Graceful fallbacks and state management
4. **Rich telemetry integration**: Extensive logging and metrics

### About LSP Workspace Symbols
1. **Requires proper workspace setup**: Not just file-level operations
2. **NavigateTo infrastructure**: Roslyn's symbol search relies on this system
3. **Performance considerations**: Full workspace indexing vs. on-demand search
4. **Client responsibility**: LSP server expects client to manage project loading

## 🚀 Next Steps

1. **Update MCP Server**: Implement solution discovery and loading logic
2. **Add State Management**: Track project initialization completion
3. **Enhance Error Handling**: Graceful fallbacks when no projects found
4. **Test Comprehensive Scenarios**: Multiple projects, complex solutions
5. **Update Documentation**: Reflect new project/solution requirements

## 📁 Files Created During Investigation

- `test-solution-loading.js` - Tests basic LSP solution detection
- `test-solution-opening.js` - Tests manual solution/open notification
- `test-project-opening.js` - Tests manual project/open notification  
- `test-vscode-approach.js` - Replicates VS Code C# extension approach
- `test-workspace-solution-detection.js` - Comprehensive workspace symbol testing
- `roslyn-source/` - Cloned Roslyn source code for analysis
- `vscode-csharp-source/` - Cloned VS Code C# extension source code for analysis

## 🎯 Success Criteria

Workspace symbols will be considered fixed when:
1. `workspace/symbol` requests return actual symbols from the codebase
2. Empty query returns all available symbols in the workspace
3. Specific queries (e.g., "Calculator") return relevant matches
4. Symbol search works consistently across all project files
5. No manual solution loading steps required from users

---

*Investigation completed: July 2, 2025*  
*Status: Solution identified, implementation required*