# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GraphQL掲示板・Twitter再現アプリ。NestJS REST API + Apollo Server GraphQL BFF + React SPAの3層マイクロサービス構成。

## Architecture

```
Client (React/Vite :5173) ↔ Nginx (443) ↔ GraphQL BFF (Apollo :4000) ↔ App (NestJS :3000) ↔ SQLite
```

- **client/**: React 19 + Vite + TanStack Router/Query + Tailwind CSS 4 + graphql-request/graphql-ws
- **graphql/**: Apollo Server 5 + Pothos schema builder + DataLoader (N+1防止) + graphql-ws subscriptions
- **app/**: NestJS 11 + libsql (SQLite) — REST API、認証、DB管理
- **docker/**: Nginx reverse proxy (SSL終端) + MailHog

**Nginx routing:**
- `/api/*` → app:3000
- `/graphql` → graphql:4000
- `/subscriptions` → graphql:4000 (WebSocket upgrade)

**Key files:**
- `app/src/main.ts` → `app/src/app.module.ts` (PostsModule, BoardsModule)
- `graphql/src/index.ts` → `graphql/src/schema.ts` (Pothos, ~1664行)
- `client/src/main.tsx` → `client/src/routes/` (TanStack file-based routing)

## Access URLs

- **Main app**: `https://127.0.0.1` (localhostではなく127.0.0.1を使うこと — CORSエラー回避)
- **GraphQL Playground**: `https://127.0.0.1/graphql`
- **Mail UI**: `http://localhost:8025` (MailHog)

**client/.env.local に必須:**
```
VITE_GRAPHQL_HTTPS_URL=https://127.0.0.1/graphql
VITE_GRAPHQL_WSS_URL=wss://127.0.0.1/subscriptions
```

## Initial Setup

SSL証明書の生成（初回のみ）:
```sh
cd docker && mkdir -p nginx/ssl
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout nginx/ssl/posts.key -out nginx/ssl/posts.crt \
  -subj "/CN=127.0.0.1" \
  -addext "subjectAltName=IP:127.0.0.1,DNS:localhost"
```

## Commands

### Docker (全サービス起動)
```sh
cd docker
docker-compose up -d
docker-compose logs -f [app|graphql|client|nginx|mail]
docker-compose down
```

### app/ (NestJS REST API)
```sh
pnpm run start:dev      # watch mode
pnpm run build
pnpm run test           # Jest unit tests
pnpm run test:e2e       # e2e with Supertest
pnpm run lint           # oxlint
pnpm run lint:fix
pnpm run format
```

### graphql/ (Apollo Server BFF)
```sh
pnpm run dev            # tsx watch mode
pnpm run codegen        # GraphQLスキーマからTS型生成
pnpm run test           # Vitest
pnpm run test:watch
pnpm run lint           # oxlint
pnpm run format
```

### client/ (React/Vite SPA)
```sh
pnpm run dev            # Vite dev server (HMR)
pnpm run build
pnpm run lint           # Biome
pnpm run lint:fix
pnpm run format
```

## Claude Code with MCP

このプロジェクトはMCP設定を `.mcp.json` に持つ（ホームディレクトリではなくプロジェクト直下）。

**有効なMCP:**
- `playwright-local`: 127.0.0.1のブラウザ確認用
- `sqlite-readonly`: `app/database/app.db` のread-only確認用

**MCP付きで起動:**
```sh
./script/claude-project-mcp
# または
claude --mcp-config .mcp.json
```

VSCodeからはコマンドパレット → `Tasks: Run Task` → `AI: Claude Code with project MCP`

## Test Users

`user.txt` にローカルテストユーザーの資格情報を生成する。`user.txt` はコミットしないこと。
追加生成: `bash script/create_users.sh`

## Key Patterns

- **認証**: bcryptjs + セッショントークン (SQLite、1日有効) + Cookie転送 (GraphQL BFF経由)
- **型安全**: Zodスキーマを `graphql/shared/schemas/` で共有、GraphQL codegen でTS型生成
- **DataLoader**: GraphQL BFFでプロフィールのバッチ取得 (N+1防止)
- **DB**: `app/database/app.db` (SQLite)、テーブル: users, user_profiles, auth, sessions
