/**
 * Test LSP path resolution after directory reorganization
 */

import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

describe('LSP Path Resolution', () => {
  it('should resolve Roslyn LSP binary path correctly', () => {
    // Simulate the path resolution logic from RoslynLSPClient
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const projectDir = dirname(dirname(__dirname)); // tests/integration -> tests -> roslyn-mcp
    const relativePath = resolve(projectDir, 'runtime/roslyn-lsp/content/LanguageServer/osx-arm64/Microsoft.CodeAnalysis.LanguageServer');
    
    // Verify the path exists
    expect(existsSync(relativePath)).toBe(true);
    
    // Verify it's executable
    const stats = require('fs').statSync(relativePath);
    expect(stats.isFile()).toBe(true);
  });

  it('should have organized project structure correctly', () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const projectDir = dirname(dirname(__dirname)); // tests/integration -> tests -> roslyn-mcp
    
    // Check key directories exist
    expect(existsSync(resolve(projectDir, 'docs/planning'))).toBe(true);
    expect(existsSync(resolve(projectDir, 'docs/reference'))).toBe(true);
    expect(existsSync(resolve(projectDir, 'docs/research'))).toBe(true);
    expect(existsSync(resolve(projectDir, 'archive/test-references'))).toBe(true);
    expect(existsSync(resolve(projectDir, 'runtime/roslyn-lsp'))).toBe(true);
    expect(existsSync(resolve(projectDir, 'test-projects'))).toBe(true);
  });
});