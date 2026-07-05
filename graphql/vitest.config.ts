import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@graphql-posts/shared': resolve(
        __dirname,
        './shared/schemas/index.ts',
      ),
      graphql: resolve(__dirname, './node_modules/graphql/index.js'),
    },
  },
  test: {
    clearMocks: true,
    environment: 'node',
    globals: false,
    include: ['**/*.spec.ts'],
    restoreMocks: true,
    server: {
      deps: {
        inline: [
          /^graphql/,
          /^@graphql-tools/,
          /^@pothos/,
        ],
      },
    },
  },
});
