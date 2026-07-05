# Claude Code セットアップメモ

## やったこと

### CLAUDE.md 作成

プロジェクト直下に `CLAUDE.md` を作成。コマンド・アーキテクチャ・アクセスURL・MCP設定などをまとめた。

### Claude関連ファイルのプロジェクト直下への集約

デフォルトでは `~/.claude/projects/<project>/` 以下に保存されるファイルを、プロジェクト直下の `.claude/` に寄せた。

`.claude/settings.local.json` に以下を追加：

```json
{
  "autoMemoryDirectory": "<repo>/.claude/memory/",
  "plansDirectory": ".claude/plans"
}
```

- **メモリ** (`autoMemoryDirectory`): `.claude/memory/` に保存される。既存ファイルも移行済み。
- **プラン** (`plansDirectory`): `.claude/plans/` に保存される。次回セッションから有効。
- **トランスクリプト** (`.jsonl`): 設定項目なし。`~/.claude/projects/` 固定のため諦め。
