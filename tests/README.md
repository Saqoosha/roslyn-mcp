# Roslyn MCP Tests

This directory contains comprehensive test scripts organized by purpose and development phase.

## 📋 Test Structure

### Production Tests
- **[production/](production/)** - Final validation and production-ready tests
  - `final-success-verification.js` - Complete 10/10 tools validation
  - `test-all-tools-after-init.js` - Comprehensive tool testing
  - `test-simple-project-green.js` - Simple project validation

### Investigation Tests
- **[investigation/](investigation/)** - Research and analysis scripts (PRESERVED)
  - **[signaturehelp/](investigation/signaturehelp/)** - SignatureHelp limitation research
  - **[monobehaviour/](investigation/monobehaviour/)** - MonoBehaviour indexing analysis
  - **[workspace-symbols/](investigation/workspace-symbols/)** - Workspace symbols deep dive
  - **[ultrathink/](investigation/ultrathink/)** - ULTRATHINK methodology investigations

### Development Tests
- **[development/](development/)** - Development utilities and debugging tools
  - `debug-lsp-startup.js` - LSP startup debugging
  - `debug-document-sync.js` - Document synchronization debugging
  - `quick-workspace-test.js` - Quick workspace testing

### Archive
- **[archive/](archive/)** - Historical tests and removed functionality
  - Tests for removed features (hover, etc.)
  - Legacy investigation scripts

## 🚀 Running Tests

### Production Validation
```bash
# Comprehensive validation (recommended)
node tests/production/final-success-verification.js

# All tools testing
node tests/production/test-all-tools-after-init.js

# Simple project test
node tests/production/test-simple-project-green.js
```

### Investigation Scripts
```bash
# SignatureHelp limitation demonstration
node tests/investigation/signaturehelp/debug-signaturehelp-issue.js

# MonoBehaviour indexing analysis
node tests/investigation/monobehaviour/fix-monobehaviour-indexing.js

# Workspace symbols analysis
node tests/investigation/workspace-symbols/test-workspace-symbols-deep.js
```

### Development Utilities
```bash
# Debug LSP startup
node tests/development/debug-lsp-startup.js

# Quick workspace test
node tests/development/quick-workspace-test.js
```

## 📊 Test Results

The production tests validate the final 100% success rate achievement:
- **10/10 tools working** - All available tools function reliably
- **Microsoft compatibility** - Exact LSP protocol implementation
- **Unity project support** - Complete Unity integration
- **Performance validation** - Response times and stability

## 🔍 Research Value

The investigation scripts preserve the complete research process:
- **Problem identification** - How issues were discovered
- **Solution development** - Step-by-step problem solving
- **Industry analysis** - Comparison with Microsoft's approach
- **Limitation understanding** - Why certain features were removed

## 🎯 Usage

For validation of the current implementation, use the `production/` tests.

For understanding the research process and technical details, explore the `investigation/` tests.

For debugging and development, use the `development/` utilities.