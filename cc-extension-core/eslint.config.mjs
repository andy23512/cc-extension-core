import baseConfig from '../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: [
            '{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}',
            '{projectRoot}/vite.config.{js,ts,mjs,mts}',
          ],
          // The rule only follows imports from TypeScript sources, so it can
          // see neither what `build-preset/**/*.cjs` requires nor the peers
          // MUI pulls in at runtime.
          ignoredDependencies: [
            'copy-webpack-plugin',
            'webpack-livereload-plugin',
            'webpack-merge',
            '@emotion/react',
            '@emotion/styled',
          ],
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
  {
    ignores: ['**/out-tsc'],
  },
];
