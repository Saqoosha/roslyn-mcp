# Repository Structure & Commit Guidelines

## 📦 What to Commit

### ✅ **Essential Files** (Always commit)
```
src/                 # Source code
tests/               # Test suites  
docs/                # Documentation
package.json         # Dependencies & scripts
tsconfig.json        # TypeScript config
tsup.config.ts       # Build config
vitest.config.ts     # Test config
.gitignore          # Git exclusions
README.md           # Project documentation
CLAUDE.md           # Claude Code instructions
```

### ✅ **Sample Projects** (Commit lightweight examples)
```
test-projects/       # C# test projects (exclude build artifacts)
examples/           # Usage examples
```

## 🚫 What NOT to Commit

### ❌ **Large Binaries** (1.1GB+ total)
```
runtime/            # Roslyn LSP binaries (222MB)
archive/            # Reference materials (870MB)
```

### ❌ **Build Artifacts**
```
node_modules/       # Dependencies (99MB)
dist/               # Build output (132KB)
*/bin/              # .NET build outputs
*/obj/              # .NET intermediate files
```

### ❌ **Development Scripts**
```
test-*.js           # Root-level test scripts
test-*.cjs          # Development testing files
```

## 🔧 Setup for New Contributors

### 1. Clone Repository
```bash
git clone <repo-url>
cd roslyn-mcp
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Download Roslyn LSP (if needed)
```bash
# Download Microsoft.CodeAnalysis.LanguageServer
# Extract to runtime/roslyn-lsp/
```

### 4. Build & Test
```bash
npm run build
npm test
```

## 📊 Repository Size Analysis

| Directory | Size | Status | Reason |
|-----------|------|--------|---------|
| `archive/` | 870MB | ❌ Excluded | Reference materials, too large |
| `runtime/` | 222MB | ❌ Excluded | Binary dependencies, downloadable |
| `node_modules/` | 99MB | ❌ Excluded | Managed by npm |
| `test-projects/` | 232KB | ✅ Included | Lightweight test cases |
| `docs/` | 208KB | ✅ Included | Essential documentation |
| `dist/` | 132KB | ❌ Excluded | Build artifacts |
| `src/` | 48KB | ✅ Included | Core source code |
| `tests/` | 4KB | ✅ Included | Test suites |

**Total Repository Size**: ~500KB (without excluded files)
**Total Project Size**: ~1.2GB (with all files)

## 🚀 Deployment Notes

- Runtime binaries should be downloaded separately during CI/CD
- Archive materials available as separate download/documentation
- Keep repository lean for fast cloning and development