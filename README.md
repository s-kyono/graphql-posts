# GraphQL Posts

React + GraphQL BFF + NestJS で作った掲示板 / SNS ライクな投稿アプリです。フロントエンド、GraphQL 層、REST API 層を分け、Docker Compose と nginx の HTTPS リバースプロキシでローカル実行できる構成にしています。

## Features

- メールアドレス / ユーザーID とパスワードによる認証
- セッション Cookie ベースのログイン状態管理
- 板、スレッド、返信投稿の作成と表示
- GraphQL subscription による投稿イベント配信
- Zod によるフォーム入力と API レスポンスの検証
- DataLoader によるプロフィール取得の N+1 抑制
- Docker Compose による client / graphql / app / nginx / mail の一括起動

## GraphQL Learning Goals

このリポジトリは、GraphQL を単体のサンプルとしてではなく、実際の Web アプリケーションの中でどう使うかを学ぶための教材です。

| Topic | Where to read | What to learn |
| --- | --- | --- |
| Query | `graphql/src/schema.ts` | 画面表示に必要なデータを GraphQL BFF 経由で取得する流れ |
| Mutation | `graphql/src/schema.ts` | ユーザー作成、板作成、投稿作成などの状態変更 |
| Subscription | `graphql/src/schema.ts`, `client/src/lib/queries/posts.ts` | WebSocket による投稿イベントと閲覧者数のリアルタイム配信 |
| Resolver | `graphql/src/schema.ts` | GraphQL field と REST API 呼び出しをつなぐ責務 |
| Context | `graphql/src/server.ts` | Cookie、Response、DataLoader を resolver へ渡す方法 |
| Error handling | `graphql/src/schema.ts`, `graphql/src/server.ts` | GraphQL エラーの message / extensions / status の返し方 |
| Validation | `graphql/shared/schemas/index.ts` | GraphQL 入力値と REST API レスポンスを Zod で検証する方法 |
| N+1 mitigation | `graphql/src/schema.ts` | `User.profile` resolver で DataLoader を使って bulk API にまとめる方法 |
| Type generation | `graphql/codegen.ts` | GraphQL schema から TypeScript 型を生成する構成 |
| Client usage | `client/src/lib/queries/*.ts` | React 側から query / mutation / subscription を呼び出す方法 |
| Tests | `graphql/src/index.spec.ts` | `graphql()` と `subscribe()` を使って GraphQL 層を直接テストする方法 |

## GraphQL Walkthrough

### 1. Query

`getBoards`, `getThreads`, `getRecentPosts`, `me`, `getUsers` が Query の例です。

```graphql
query GetRecentPosts($limit: Int) {
  getRecentPosts(limit: $limit) {
    id
    threadId
    userId
    userName
    title
    content
    createdAt
  }
}
```

見るポイント:

- クライアントは必要な field だけを選んで取得する
- GraphQL resolver は REST API から取得した値を GraphQL の型へ整える
- `me` は Cookie を context から受け取り、認証状態を REST API に問い合わせる

### 2. Mutation

`createUser`, `createBoard`, `createPost`, `logout` が Mutation の例です。

```graphql
mutation CreatePost($threadId: String!, $userId: String!, $content: String) {
  createPost(threadId: $threadId, userId: $userId, content: $content) {
    id
    threadId
    userId
    content
    createdAt
  }
}
```

見るポイント:

- GraphQL の required argument と Zod の validation を組み合わせる
- REST API の失敗を GraphQL エラーとして返す
- 投稿作成後に Subscription 用のイベントを発火する

### 3. Subscription

`onNewPost`, `threadViewerCount`, `userCreated` が Subscription の例です。

```graphql
subscription OnNewPost($threadId: String!) {
  onNewPost(threadId: $threadId) {
    id
    threadId
    userName
    content
    createdAt
  }
}
```

見るポイント:

- HTTP の Query / Mutation と WebSocket の Subscription を分けて扱う
- `threadId` ごとにイベント名を分け、必要な購読者だけへ配信する
- iterator の `return()` で購読解除時の後始末を行う

### 4. DataLoader

`User.profile` field は DataLoader の例です。

```graphql
query GetUsers {
  getUsers {
    userId
    email
    name
    profile {
      bio
      avatarUrl
      avatarColors
    }
  }
}
```

見るポイント:

- `getUsers` はユーザー一覧を取得する親 resolver
- `profile` は各ユーザーごとに解決される field resolver
- DataLoader により複数ユーザーの profile 取得を `/users/profiles/bulk` へまとめる

### 5. Validation and Error

入力値は `graphql/shared/schemas/index.ts` の Zod schema で検証します。

```graphql
mutation CreateUser($email: String!, $password: String!) {
  createUser(email: $email, password: $password) {
    userId
    email
    message
  }
}
```

見るポイント:

- GraphQL の型は構造を表し、Zod はアプリケーションルールを表す
- `password` の最小文字数や email 形式は Zod で検証する
- 不正な入力では REST API を呼ばずに GraphQL エラーを返す

## Example Operations

Apollo Sandbox / GraphQL endpoint から試せる操作例です。

```graphql
query Hello {
  hello
}
```

```graphql
mutation CreateBoard($name: String!, $description: String) {
  createBoard(name: $name, description: $description) {
    id
    name
    description
    createdAt
  }
}
```

Variables:

```json
{
  "name": "graphql",
  "description": "GraphQL の動作確認用の板"
}
```

```graphql
query GetBoards {
  getBoards {
    id
    name
    description
    createdAt
  }
}
```

```graphql
subscription ThreadViewerCount($threadId: String!) {
  threadViewerCount(threadId: $threadId)
}
```

Variables:

```json
{
  "threadId": "graphql"
}
```

## Architecture

```txt
Browser
  -> nginx HTTPS reverse proxy
  -> GraphQL BFF (Apollo Server)
  -> REST API (NestJS)
  -> SQLite
```

| Directory | Role |
| --- | --- |
| `client/` | React 19 + Vite + TanStack Router + Tailwind CSS |
| `graphql/` | Apollo Server + Pothos + DataLoader + graphql-ws |
| `app/` | NestJS REST API + SQLite + bcryptjs authentication |
| `docker/` | Docker Compose, nginx, Mailpit service |
| `graphql/shared/` | Zod schemas shared by API and GraphQL layers |

## Request Flow

```txt
React component
  -> client/src/lib/queries/*.ts
  -> GraphQL HTTPS endpoint or WebSocket endpoint
  -> graphql/src/schema.ts resolver
  -> NestJS REST API
  -> SQLite
```

Examples:

- Signup: `client/src/routes/signup.tsx` -> `createUser` mutation -> `POST /api/users`
- Login: `client/src/lib/queries/auth.ts` -> `login` query -> `POST /api/login` -> `Set-Cookie`
- Current user: `me` query -> context Cookie -> `GET /api/me`
- New post: `createPost` mutation -> `POST /api/posts` -> `onNewPost` subscription event
- User profile: `getUsers.profile` field -> DataLoader -> `POST /api/users/profiles/bulk`

## Tech Stack

- TypeScript
- React / Vite / TanStack Router / TanStack Query
- Apollo Server / Pothos / graphql-ws
- NestJS / libSQL SQLite / bcryptjs
- Zod
- Docker Compose / nginx
- Vitest / Jest / Biome / oxlint

## Local Setup

Generate a local self-signed certificate first. The generated files under `docker/nginx/ssl/` are ignored by git.

```sh
cd docker
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout nginx/ssl/posts.key \
  -out nginx/ssl/posts.crt \
  -subj "/CN=127.0.0.1" \
  -addext "subjectAltName=IP:127.0.0.1,DNS:localhost"
```

Start all services:

```sh
cd docker
docker compose up -d
```

Open:

- App: `https://127.0.0.1`
- GraphQL endpoint: `https://127.0.0.1/graphql`
- Mail UI: `http://localhost:8025`

Optional local env files:

- `docker/.env.local`
- `client/.env.local`

These files are ignored by git.

## Development Commands

```sh
# app
cd app
pnpm test
pnpm run lint

# graphql
cd graphql
pnpm test
pnpm run lint

# client
cd client
pnpm run build
pnpm run lint
```

## GraphQL Test Commands

Run the GraphQL layer tests:

```sh
cd graphql
pnpm test
```

Run GraphQL code generation after the GraphQL server is available:

```sh
cd graphql
pnpm run codegen
```

The current tests cover:

- Query execution through `graphql()`
- Mutation execution and REST API forwarding
- Zod validation errors before backend calls
- Cookie forwarding for login / logout
- Subscription execution through `subscribe()`
- Context-based resolver dependencies such as Cookie and `profilesLoader`

## Not Covered Yet

The current scope intentionally focuses on GraphQL basics in an application flow. These topics are good next steps for deeper schema design practice:

- Fragment colocation and reusable client operations
- Interface / Union types for polymorphic results
- Cursor pagination and connection-style list design
- Filtering, sorting, and search arguments
- Schema evolution, deprecation, and backward compatibility
- Authorization rules at field / resolver level
- Persisted queries, operation allowlists, and production hardening

See `doc/memorys/GraphQLDesignRoadmap.md` for the step-by-step study roadmap.

## Notes

- Runtime DB files under `app/database/` are ignored except `.gitkeep`.
- Local SSL certificates, `.env.local`, MCP caches, and editor/runtime caches are ignored.
- Project-local MCP setup notes are kept in `doc/mcp-local.md`.
