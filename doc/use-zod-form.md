# useZodForm

純粋 React 19 で react-hook-form / TanStack Form 相当の DX を再現したカスタムフック。

## 基本的な使い方

```tsx
const { formAction, register, formState: { errors, formError, values, isPending } } =
  useZodForm(loginByEmailSchema, async (data) => {
    // バリデーション通過後に呼ばれる
  });

<form action={formAction}>
  <input {...register("email")} />
  {errors.email && <p>{errors.email}</p>}
  {formError && <p>{formError}</p>}
  <button type="submit" disabled={isPending}>送信</button>
</form>
```

## オプション

```ts
useZodForm(schema, onValid, {
  validators: {
    onBlur: true,    // blur 時にバリデーション（デフォルト: true）
    onChange: false, // change 時にバリデーション（デフォルト: false）
  }
})
```

### validators の組み合わせ

| onBlur | onChange | 動作 |
|--------|----------|------|
| `true` | `false`  | blur 後に onChange も発火（onTouched 相当）← デフォルト |
| `false`| `true`   | 最初の入力から即時検証 |
| `true` | `true`   | blur + 最初から onChange |
| `false`| `false`  | submit のみ |

## formState

| プロパティ | 型 | 説明 |
|------------|-----|------|
| `errors` | `FieldErrors<T>` | フィールドレベルのエラー |
| `formError` | `string \| undefined` | フォームレベルのエラー（refine の path なし） |
| `values` | `Partial<Record<keyof T, string>>` | リアルタイムの入力値（動的 UI 用） |
| `isPending` | `boolean` | 送信中フラグ |

## 動的 UI

`values` はリアルタイムにフィールドの値を購読できる。

```tsx
const { formState: { values } } = useZodForm(...);

<PasswordStrengthMeter value={values.password ?? ""} />
<span>{values.bio?.length ?? 0} / 200</span>
```

## cross-field バリデーション（refine）

touched な全フィールドを一括再検証するため、Zod の refine が連動して更新される。

```ts
const schema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "パスワードが一致しません",
  path: ["confirmPassword"],
});
```

`password` を変えると `confirmPassword`（touched 済みなら）のエラーも自動更新される。

## 設計

### React 19 との対応

| react-hook-form | React 19 純正 |
|-----------------|---------------|
| `useForm({ resolver })` | `useZodForm` → 内部で `useActionState` |
| `handleSubmit(fn)` / `onSubmit` | `<form action={formAction}>` |
| `formState.isSubmitting` | `isPending`（`useActionState` の3番目の戻り値） |
| `register("name")` | `register("name")` → `{ name, defaultValue, onChange, onBlur }` |

### バリデーションの発火タイミング

```
[submit]  → useActionState の action で Zod 全体検証
[blur]    → validators.onBlur: true のとき、touched に追加 + 再検証
[change]  → validators.onChange: true のとき即時再検証
             validators.onBlur: true のとき、touched 後から再検証
```

### エラーのマージ戦略

```
touched フィールド → clientErrors（onBlur / onChange の結果）
未タッチフィールド → state.errors（submit 時の結果）
```

### ローカル state の管理

`useReducer` でローカル state を一本化し、`reset` dispatch で原子的にリセット。

```ts
type LocalAction<T> =
  | { type: "touch"; name: string }
  | { type: "touchAndValidate"; name: string; errors; formError }
  | { type: "validate"; errors; formError }
  | { type: "setLiveValue"; name: string; value: string }
  | { type: "reset" }
```

送信成功時（`_successCount` が増加）に `useEffect` → `dispatch({ type: "reset" })` で一括リセット。

### 2重送信防止

| レイヤー | 担当 |
|----------|------|
| `isPending` + `disabled` | UI 層（ボタン無効化） |
| `isSubmittingRef` | ロジック層（action 内のガード） |

## 将来的に追加したい機能

- `setError(name, message)` — GraphQL mutation のサーバーエラーをフィールドに注入
- `reset(values?)` — 任意のタイミングで値ごとリセット
- `defaultValues` — 編集フォームでの初期値流し込み
- `trigger(name?)` — 手動でバリデーション発火（多ステップフォーム用）
- `isDirty` — 未保存変更の検知
- 非同期バリデーション（`onBlurAsync`）— メールアドレス重複チェックなど
- debounce オプション — onChange 検証の遅延

## TanStack Form との差分

| 機能 | useZodForm | TanStack Form |
|------|-----------|---------------|
| フォームレベル validators | ✅ | ✅ |
| フィールドレベル validators | ❌ | ✅ |
| 非同期バリデーション | ❌ | ✅（`onBlurAsync`）|
| debounce | ❌ | ✅（`asyncDebounceMs`）|
| `useStore(selector)` 細粒度購読 | ❌ | ✅ |
| `field.state.meta`（per-field） | ❌ | ✅ |
| `validators.onMount` | ❌ | ✅ |
| `formOptions()` 設定共有 | ❌ | ✅ |
