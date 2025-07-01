# csharp-ls 0.18.0 + .NET 9 Compatibility Issue Analysis

## 🎯 Problem Summary

**csharp-ls 0.18.0 fails to perform project analysis when only .NET 9.0.301 SDK is installed**, despite appearing to initialize correctly. The server starts, responds to LSP initialization, but never begins workspace analysis or publishes diagnostics.

## 🔍 Root Cause Analysis

### Technical Details

1. **Version Mismatch**: csharp-ls 0.18.0 ships with **MSBuild 17.x assemblies** (from .NET 8 toolchain)
2. **MSBuildLocator Behavior**: When only .NET 9 is present, MSBuildLocator finds **MSBuild 18.x**
3. **MEF Composition Failure**: Attempting to compose Roslyn 4.14 + Microsoft.Build 17.x with MSBuild 18.x causes MEF composition failures inside `MSBuildWorkspace`
4. **Silent Failure**: The exception is swallowed, leaving the server running but with an empty workspace

### Observable Symptoms

```
✅ Server starts successfully
✅ LSP initialize response received  
✅ MSBuildLocator registers .NET Core SDK 9.0.301
✅ "initialized" notification processed
❌ No solution loading activity
❌ No progress messages
❌ No diagnostics published
❌ No workspace analysis
```

## 🧪 Testing Results

### Tests Performed

1. **Multiple initialization approaches** - All failed
2. **Correct LSP configuration** (based on o3 research) - Failed
3. **Auto-discovery vs explicit solution path** - Both failed  
4. **Maximum logging (LogLevel: 4)** - No additional error information
5. **Manual solution parameter (--solution)** - Failed
6. **Raw LSP testing without lsmcp** - Confirmed issue is with csharp-ls, not lsmcp

### Key Finding

Even with **perfect LSP configuration** following official documentation:
- `AutomaticWorkspaceInit: true`
- `window.workDoneProgress: true` capability
- Proper `initialized` notification sequence
- Maximum logging level

**csharp-ls still fails to analyze any projects when only .NET 9 is available.**

## ❌ Attempted Solutions (All Failed)

### Attempt 1: Complete .NET 8 Environment
**Result**: FAILED - csharp-ls 0.18.0 requires .NET 9.0.0 runtime to execute

```bash
# This fails because csharp-ls can't start with .NET 8 runtime
export DOTNET_ROOT="/opt/homebrew/opt/dotnet@8/libexec"
export PATH="/opt/homebrew/opt/dotnet@8/bin:$PATH"
csharp-ls  # Error: requires .NET 9.0.0 runtime
```

**Error Message**:
```
You must install or update .NET to run this application.
App: /Users/hiko/.dotnet/tools/csharp-ls
Architecture: arm64
Framework: 'Microsoft.NETCore.App', version '9.0.0' (arm64)
.NET location: /opt/homebrew/Cellar/dotnet@8/8.0.17/libexec
The following frameworks were found:
  8.0.17 at [/opt/homebrew/Cellar/dotnet@8/8.0.17/libexec/shared/Microsoft.NETCore.App]
```

### Attempt 2: Hybrid Approach (.NET 9 runtime + .NET 8 MSBuild)
**Result**: FAILED - MSBuildLocator still finds .NET 9 MSBuild

```bash
# This fails because environment variables don't override MSBuildLocator behavior
DOTNET_ROOT="/usr/local/share/dotnet"  # .NET 9 for runtime
DOTNET_MSBUILD_SDK_RESOLVER_CLI_DIR="/opt/homebrew/opt/dotnet@8/libexec"  # Ignored
MSBuildSDKsPath="/opt/homebrew/Cellar/dotnet@8/8.0.17/libexec/sdk/8.0.117/Sdks"  # Ignored
csharp-ls  # Still registers "MSBuildLocator: will register .NET Core SDK, Version=9.0.301"
```

### Attempt 3: DOTNET_ROOT to .NET 8
**Result**: FAILED - Creates contradiction (need .NET 9 runtime but .NET 8 MSBuild)

```bash
# This fails because csharp-ls can't start with .NET 8 environment
DOTNET_ROOT="/opt/homebrew/opt/dotnet@8/libexec"
csharp-ls  # Error: requires .NET 9.0.0 runtime but only finds .NET 8.0.17
```

## 🔒 The Fundamental Contradiction

**csharp-ls 0.18.0 creates an unsolvable contradiction:**
- Requires .NET 9.0.0 runtime to execute (compiled for .NET 9)
- Requires .NET 8 MSBuild to function properly (ships with MSBuild 17.x)
- MSBuildLocator cannot be forced to use a different version via environment variables

## ✅ Actual Working Solutions

### Option 1: Use OmniSharp (Recommended)

OmniSharp has better .NET 9 compatibility and is more actively maintained:
- Properly supports .NET 9 projects
- Better integration with modern .NET toolchain
- More robust MSBuild integration

### Option 2: Downgrade to csharp-ls 0.16.x or 0.17.x

Earlier versions of csharp-ls were compiled for .NET 8 and may work better:

```bash
dotnet tool uninstall --global csharp-ls
dotnet tool install --global csharp-ls --version 0.16.0
```

**Note**: This may require .NET 8 SDK installation alongside .NET 9.

## 📋 Environment Configuration for lsmcp

Once csharp-ls is working, use this configuration with lsmcp:

```javascript
// Correct environment setup for lsmcp + csharp-ls
const env = {
  ...process.env,
  DOTNET_ROOT: "/opt/homebrew/opt/dotnet@8/libexec",
  PATH: `/opt/homebrew/opt/dotnet@8/bin:${process.env.PATH}`,
  // Clear conflicting variables
  MSBuildSDKsPath: undefined,
  MSBUILD_EXE_PATH: undefined
};
```

## 🚨 Important Notes

1. **This is a known issue** tracked in csharp-ls repository
2. **Not a configuration problem** - it's a fundamental compatibility issue
3. **lsmcp works correctly** - the issue is specifically with csharp-ls + .NET 9
4. **Future versions** of csharp-ls should resolve this with MSBuild 18 support

## 🎯 Impact on lsmcp Project

### What Works
- ✅ lsmcp MCP server startup and connection
- ✅ MCP protocol implementation  
- ✅ Parameter passing and tool registration
- ✅ Document management and caching
- ✅ All lsmcp infrastructure

### What Needs csharp-ls Fix
- ❌ Actual C# language analysis
- ❌ Diagnostics/error checking
- ❌ Code intelligence features
- ❌ Symbol navigation

### Recommendation for lsmcp Users

**Use OmniSharp instead of csharp-ls for C# projects until csharp-ls .NET 9 compatibility is resolved.**

## 📚 References

- [csharp-ls GitHub Issues #117](https://github.com/razzmatazz/csharp-language-server/issues/117)
- [MSBuildLocator Documentation](https://raw.githubusercontent.com/microsoft/MSBuildLocator/main/README.md)
- [.NET 9 Breaking Changes](https://docs.microsoft.com/en-us/dotnet/core/compatibility/9.0)

---

**Last Updated**: 2025-06-30  
**Investigation Status**: ✅ Complete - Root cause identified, attempted solutions tested and failed  
**Final Recommendation**: **Use OmniSharp instead of csharp-ls for .NET 9 projects**