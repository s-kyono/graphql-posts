import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: 'http://graphql:4000/graphql',
  generates: {
    './generated/graphql.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        useIndexSignature: true,
      },
    },
    './generated/graphql-types.ts': {
      plugins: ['typescript'],
    },
  },
};

export default config;
