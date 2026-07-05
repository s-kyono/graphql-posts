# GraphQL Query Integration Test 改善メモ

## 完了済み

- Query.hello
- Query.login
  - emailログイン
  - userIdログイン
  - email/userId未指定
  - email/userId同時指定
- Query.getUsers
- Query.getThreads

---

# 今後の改善候補

## 1. graphql の import を簡潔にする

### 現在

```ts
import { graphql } from 'graphql/index.js';
```

### 推奨

```ts
import { graphql } from 'graphql';
```

**理由:**

- 公開APIを利用する
- 内部パス依存を避ける

---

## 2. getUsers / getThreads の HTTPエラー系を追加する

### 現状

通信例外のみ検証

```ts
vi.spyOn(globalThis, 'fetch').mockRejectedValue(   new Error('Backend unavailable'), );
```

### 追加したいケース

```ts
{   ok: false,   json: async () => ({     message: 'Internal Server Error',   }), }
```

確認したいこと:

- GraphQL Errorになること
- 適切なメッセージが返ること

---

## 3. login の Backendエラー系を追加する

### 追加候補

ts {   ok: false,   json: async () => ({     message: 'ログインに失敗しました。',   }), }

確認したいこと:

- GraphQL Errorになること
- messageが正しく返ること

---

## 4. GraphQL実行ヘルパーの作成

### 現状

各テストで毎回

```ts
graphql({   schema: createSchema(),   contextValue: createContext(),   source,   variableValues, });
```

を書いている

### 将来

```ts
executeGraphql({   source,   variableValues, });
```

にまとめる

※ 現時点では不要
※ テストが増えたら検討

---

## 5. Responseモックの共通化

### 現状

```ts
{   ok: true,   json: async () => data, } as Response
```

を毎回作成

### 将来

```ts
const mockJsonResponse = (   body: unknown,   ok = true, ): Response =>   ({     ok,     json: async () => body,   }) as Response;
```

で共通化

※ 現時点では不要

---

# 次フェーズ

## Mutation

優先順

### createUser

確認項目

- 正常系
- Backendエラー系
- fetch呼び出し確認

---

### createPost

確認項目

- 正常系
- Backendエラー系
- fetch呼び出し確認

---

# その次

## Subscription

対象

- userCreated
- onNewPost

確認項目

- subscribe開始
- EventEmitter通知
- GraphQL Subscription受信

---

# 方針

- Query → Mutation → Subscription の順で進める
- E2Eはまだ作らない
- createSchema() + graphql() の Integration Test を中心に進める
- HTTPサーバ起動テストは後回し

## Mutation改善候補

- createUserでも response.ok を確認する

- createUser の ok:false テストを追加する

- createUser / createPost の EventEmitter 発火確認は Subscription テストで扱う