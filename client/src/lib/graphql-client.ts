import { GraphQLClient } from "graphql-request";
import { createClient } from "graphql-ws";

export const gqlClient = new GraphQLClient(
  import.meta.env.VITE_GRAPHQL_HTTPS_URL ?? "https://127.0.0.1/graphql",
  { credentials: "include" }
);

export const wsClient = createClient({
  url: import.meta.env.VITE_GRAPHQL_WSS_URL ?? "wss://127.0.0.1/subscriptions",
  lazy: true,
  retryAttempts: 5,
  shouldRetry: () => true,
});
