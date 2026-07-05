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

## Notes

- Runtime DB files under `app/database/` are ignored except `.gitkeep`.
- Local SSL certificates, `.env.local`, MCP caches, and editor/runtime caches are ignored.
- Project-local MCP setup notes are kept in `doc/mcp-local.md`.
