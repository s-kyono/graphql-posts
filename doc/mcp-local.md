# Project-local MCP setup

This repository keeps MCP configuration in the project, not in `~` or any user-level config.
MCP package caches are also kept under `.mcp-cache/`, which is ignored by git.

## Claude Code

Claude Code can read the project `.mcp.json` directly.

```sh
./script/claude-project-mcp
```

You can also pass it explicitly:

```sh
claude --mcp-config .mcp.json
```

## Codex

Codex normally reads MCP servers from user-level config, so this repo uses a local wrapper that injects the MCP settings with `-c`.

```sh
./script/codex-project-mcp
```

The same server definitions are mirrored in `codex.mcp.toml` for humans to read.

## VSCode

VSCode extensions usually start Codex or Claude Code with their own command, so they do not automatically run the wrapper scripts in this repository.

Use `Tasks: Run Task` and choose one of:

- `AI: Codex with project MCP`
- `AI: Claude Code with project MCP`

## Enabled servers

- `playwright-local`
  - Uses `npx -y @playwright/mcp@latest`.
  - Limited to local hosts: `localhost`, `127.0.0.1`.
  - Intended for the app, HTTPS localhost, and Mailpit UI.
  - Stability notes: see `doc/playwright-mcp-stability.md`.

- `sqlite-readonly`
  - Uses the repo-local `script/mcp/sqlite_readonly_server.py`.
  - Opens `app/database/app.db` with SQLite `mode=ro`.
  - Exposes only read-only tools: `database_path`, `list_tables`, `describe_table`, and `query`.
  - `query` accepts only `SELECT`, `WITH`, and `EXPLAIN`.

## Not enabled

- GitHub MCP: intentionally skipped because it can touch remote state.
- Docker MCP: intentionally skipped for now because Docker socket access is powerful and the compose stack is already manageable from the terminal.
