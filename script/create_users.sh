#!/usr/bin/env bash

set -u

# 出力ファイル名
OUTPUT_FILE="user.txt"
GRAPHQL_URL="${GRAPHQL_URL:-https://localhost/graphql}"

# 既存ファイルを初期化
> "$OUTPUT_FILE"

echo "🚀 ユーザー100件の自動生成を開始します(HTTPS)..."
echo "--------------------------------------"

for i in $(seq 1 100)
do
  # 連番を使ったメールアドレスを生成
  EMAIL="test-user-${i}@example.com"

  # 自己署名証明書でも通せるように -k を付ける
  RESPONSE=$(curl -s -k -X POST "$GRAPHQL_URL" \
    -H "Content-Type: application/json" \
    --data-binary @- <<JSON
{"query":"mutation CreateUser(\$email: String!) { createUser(email: \$email) { userId password } }","variables":{"email":"$EMAIL"}}
JSON
  )

  # jqでデータが正しく取れているか抽出
  UUID=$(echo "$RESPONSE" | jq -r '.data.createUser.userId // empty')
  PASS=$(echo "$RESPONSE" | jq -r '.data.createUser.password // empty')

  # jqでデータが正しく取れているか抽出
  if [ -n "$UUID" ] && [ -n "$PASS" ]; then
    echo "✅️ $EMAIL: 作成成功"
    # user.txtへ確実に保存!!
    echo "[ID] $UUID  | [EMAIL] $EMAIL | [PASS] $PASS" >> "$OUTPUT_FILE"
  else
    # 取れなかったら場合はGraphQLのエラーメッセージを画面に出す
    ERR_MSG=$(echo "$RESPONSE" | jq -r '.errors[0].message // "Unknown Error"')
    echo "❌️ $EMAIL: 作成失敗($ERR_MSG)"
  fi

  # サーバに優しくするためにほんの少しだけウェイトを入れる
  sleep 0.05
done

echo "--------------------------------------"
echo "🎉 完了しました！ '$OUTPUT_FILE' を確認してください。"
