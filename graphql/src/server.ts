import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import express from 'express';
import { createServer } from 'http';
import { useServer } from 'graphql-ws/use/ws';
import { WebSocketServer } from 'ws';

import {
  createProfilesLoader,
  createSchema,
  USE_DATALOADER,
} from './schema.js';

const loggingPlugin = {
  async requestDidStart(requestContext: any) {
    const query =
      requestContext.request.query?.replace(/\s+/g, ' ').trim() || '';
    const operationName =
      requestContext.request.operationName || 'UnnamedOperation';
    if (!query.includes('IntrospectionQuery')) {
      console.log(
        `\n [Graphql BFF] Request operation: ${operationName} | Mode: ${USE_DATALOADER ? 'DataLoader ON' : 'DataLoader OFF'} \n Query: ${query} \n`,
      );
    }

    return {
      async willSendResponse() {
        if (!query.includes('IntrospectionQuery')) {
          console.log(
            `[Graphql BFF] Response sent back successfully for operation: ${operationName} \n`,
          );
        }
      },
    };
  },
};

export const startServer = async () => {
  const app = express();
  const httpServer = createServer(app);
  const schema = createSchema();

  const wsServer = new WebSocketServer({ noServer: true });
  const serverCleanup = useServer({ schema }, wsServer);

  const server = new ApolloServer({
    schema,
    includeStacktraceInErrorResponses: true,
    plugins: [
      loggingPlugin,
      ApolloServerPluginDrainHttpServer({ httpServer }),
      ApolloServerPluginLandingPageLocalDefault({ embed: true }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
    formatError: (formattedError, error: any) => {
      const originalError = error?.originalError;
      return {
        message: formattedError.message,
        path: formattedError.path,
        extensions: {
          code: formattedError.extensions?.code ?? originalError?.code ?? 'INTERNAL_SERVER_ERROR',
          status: formattedError.extensions?.status ?? originalError?.status ?? 500,
        },
      };
    },
  });

  await server.start();

  app.use(express.json());

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req, res }) => {
        return {
          cookie: req.headers.cookie,
          profilesLoader: createProfilesLoader(),
          response: res,
        };
      },
    }),
  );

  const PORT = 4000;

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(
      `🚀 GraphQL BFF is running at http://localhost:${PORT}/graphql`,
    );
    console.log(
      `🚀 GraphQL BFF WebSocket server is running at ws://localhost:${PORT}/subscriptions`,
    );
  });

  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = new URL(
      request.url || '',
      `http://${request.headers.host}`,
    ).pathname;

    if (pathname === '/subscriptions') {
      wsServer.handleUpgrade(request, socket, head, (ws) => {
        wsServer.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });
};
