FROM node:24-alpine

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /usr/src/app

# pnpmは10系を使用 11系だと依存関係がより厳密に管理されるため、Nest.jsの 最新版initializerが動かないため
RUN corepack prepare pnpm@10 --activate

COPY client/package.json client/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

CMD ["sh", "-c", "pnpm dev --host 0.0.0.0"]
