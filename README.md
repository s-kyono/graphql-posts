# grahql 掲示板・Twitter再現

## ホストマシン上で https, wssを再現するため、以下のコマンドを実行し証明書を発行

```sh
cd docker
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 -keyout nginx/ssl/posts.key -out nginx/ssl/posts.crt -subj "/CN=localhost"
```

**opensslコマンドのオプションの説明:**

- req: 証明書署名要求(CSR)や証明書を生成するコマンド

- x509: 認証局(CA)を介さず、自己署名のX.509証明書を生成するオプション

- nodes: 秘密鍵をパスフレーズなしで生成するオプション

- days 3650: 証明書の有効期限を3650日（約10年）に設定

- newkey rsa:2048: RSAアルゴリズムを使用して2048bitの新しい秘密鍵を生成

- keyout: 生成した秘密鍵の出力先を指定

- out: 生成した証明書の出力先を指定

- subj: 証明書のサブジェクト情報を指定（この例では CN=localhost）

## AIエージェントの起動

このプロジェクトでは、MCP設定をホームディレクトリではなくプロジェクト直下に置いています。

有効にしているMCP:

- `playwright-local`: localhost / 127.0.0.1 の画面確認用
- `sqlite-readonly`: `app/database/app.db` をread-onlyで確認する用

### VSCodeから起動する

VSCodeのコマンドパレットから以下を実行します。

```txt
Tasks: Run Task
```

CodexをMCP付きで起動:

```txt
AI: Codex with project MCP
```

Claude CodeをMCP付きで起動:

```txt
AI: Claude Code with project MCP
```

VSCode拡張の通常ボタンから起動した場合、このプロジェクトのMCP設定は自動では読み込まれません。

### ターミナルから起動する

Codex:

```sh
./script/codex-project-mcp
```

Claude Code:

```sh
./script/claude-project-mcp
```

Claude Codeは明示的に `.mcp.json` を指定しても起動できます。

```sh
claude --mcp-config .mcp.json
```

詳しくは `doc/mcp-local.md` を参照してください。
