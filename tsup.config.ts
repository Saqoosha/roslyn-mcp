import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node18',
  splitting: false,
  bundle: true,
  external: ['@modelcontextprotocol/sdk'],
  esbuildOptions(options) {
    options.banner = {
      js: '#!/usr/bin/env node'
    };
  }
});