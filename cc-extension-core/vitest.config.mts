import { defineConfig } from 'vitest/config';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../node_modules/.vite/cc-extension-core',
  test: {
    name: 'cc-extension-core',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    // tangent-cc-lib is ESM but pulls in eventemitter2, a CommonJS module
    // whose named exports Node's ESM interop cannot resolve when the dependency
    // is left external. Inlining it lets Vite transform the whole graph.
    server: {
      deps: {
        inline: ['tangent-cc-lib', 'eventemitter2'],
      },
    },
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
    },
  },
}));
