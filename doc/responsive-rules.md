# レスポンシブデザインルール

## 基本方針

- **モバイルファースト**: デフォルトスタイルはモバイル向けに記述し、`min-width` で上書きする
- **デスクトップファーストは禁止**: `max-width` のメディアクエリは使わない
- JSX にレスポンシブクラスが多くなる場合は CSS 側で `@apply` を使う

---

## ブレイクポイント

Tailwind v4 のデフォルト準拠。

| 名前 | 幅          | 用途             |
|------|-------------|------------------|
| `sm` | `640px`~    | 大きめスマホ     |
| `md` | `768px`~    | タブレット       |
| `lg` | `1024px`~   | ラップトップ     |
| `xl` | `1280px`~   | デスクトップ     |

基本的に `md` と `lg` の2段階で十分。細かくしすぎない。

---

## 記述パターン

### Tailwind（シンプルなケース）

```tsx
<div className="flex flex-col gap-4 md:flex-row md:gap-6">
```

### CSS + `@apply`（JSX が複雑になるケース）

```css
.card-grid {
  display: grid;
  grid-template-columns: 1fr;

  @apply gap-4 p-4;

  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
    @apply gap-6 p-8;
  }
}
```

判断基準: レスポンシブクラスが **3つ以上並ぶ** なら CSS に逃がす。

---

## レイアウト

| 用途                   | 手法                                          |
|------------------------|-----------------------------------------------|
| 横並び→縦積み          | `flex-col` → `md:flex-row`                    |
| カードグリッド          | `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))` |
| センタリング            | `mx-auto` + `max-w-*`                         |
| サイドバー付きレイアウト | `grid` + `lg:grid-cols-[240px_1fr]`           |

---

## タイポグラフィ

| 要素 | モバイル | デスクトップ (`lg:`) |
|------|----------|----------------------|
| `h1` | `36px`   | `56px`               |
| `h2` | `20px`   | `24px`               |
| 本文 | `16px`   | `18px`               |

---

## タッチターゲット

インタラクティブ要素（ボタン・リンク・入力欄）は最小 **48px × 48px** を確保する。

```css
.button {
  min-height: 48px;
  min-width: 48px;
  @apply px-4;
}
```

---

## 画像

- `width: 100%` + `height: auto` をデフォルトにする
- `<img>` には必ず `srcset` または `sizes` を指定する
- フォーマットは WebP を優先する

---

## やってはいけないこと

- `max-width` メディアクエリ
- `px` 固定幅（レイアウトに `width: 400px` など）
- タッチターゲットが 48px 未満
- `@media (max-width: 1024px)` でモバイル対応を後付け
