# かいもの相談 — AI買い物コンシェルジュ

比較疲れしない、迷いを減らす買い物相談Webアプリ。
自由入力 → AIが簡易ヒアリング → 楽天市場から2〜4件に絞って提案する体験。

## 技術スタック

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Gemini 2.5 Flash API (無料枠で運用)
- 楽天市場 Ichiba Item Search API
- Vercel (デプロイ先想定)

## セットアップ

### 1. APIキーを取得する (所要30分・全て無料)

**Gemini APIキー**
1. https://aistudio.google.com/app/apikey にアクセス
2. Googleアカウントでログイン
3. 「Create API key」をクリック → `AIzaSy...` で始まるキーをコピー
4. クレカ登録は不要 (無料枠は1日1,500リクエスト)

**楽天 applicationId / accessKey**
1. https://webservice.rakuten.co.jp/ にアクセス
2. 楽天会員でログイン
3. 「アプリID発行」をクリック
4. アプリ名: `かいもの相談` など、アプリURL: `https://example.com` (後で本番ドメインへ差し替え)
5. 発行された `applicationId` と `accessKey` の2つをコピー
6. 「許可ドメイン」に本番公開予定のドメインを追加（`rakuten.co.jp` はデフォルト許可）

**楽天 affiliateId**
1. https://affiliate.rakuten.co.jp/ にアクセス
2. ログインするとマイページに 20桁の英数字の affiliateId が表示される

### 2. 環境変数を設定

`.env.local` を開いて、取得したキーを入れてください。

```
GEMINI_API_KEY=AIzaSy...
RAKUTEN_APP_ID=1234567890
RAKUTEN_ACCESS_KEY=your_rakuten_access_key
RAKUTEN_AFFILIATE_ID=abcd1234.ef567890.abcd1234.ef567890
# 本番ドメインを登録したら、そのURLに差し替え
RAKUTEN_REFERER=https://rakuten.co.jp/
# (任意) SSR時のメタデータ用。デプロイ先のURLを設定
NEXT_PUBLIC_SITE_URL=https://kaimono.example
```

`RAKUTEN_ACCESS_KEY` は楽天 Web Service のアプリID発行時に同時発行されます。
`RAKUTEN_REFERER` は楽天開発者ダッシュボードの「許可ドメイン」と一致している必要があります。

### 3. 依存をインストールして起動

```bash
npm install
npm run dev
```

http://localhost:3000 を開いて動作確認してください。

## 画面構成（現行）

- `/` メイン SPA: メモ作成 → ヒアリング → 結果まで同一画面で遷移。
  - ヘッダーに `カテゴリ` 導線
  - クエリ `?start=<テキスト>` を付けると、起動直後にそのテキストで自動的にメモを作成する
- `/category` 代表的なカテゴリから相談を始めるための一覧
- `/category/[slug]` 各カテゴリの選び方ランディング（SSG・BreadcrumbList / Article / FAQPage の JSON-LD 付き）
- `/privacy` プライバシーポリシー
- `/terms` 利用規約
- `/sitemap.xml` / `/robots.txt` 自動生成

### 互換用のリダイレクトスタブ

過去のURLを壊さないため、以下は `/` への `redirect()` を返すだけの薄いスタブとして残しています。
- `/chat` → `/?start=<q>` （`q` があれば引き継ぐ）
- `/result` → `/`
- `/consult` → `/`
- `/history` → `/`

## API エンドポイント

- `POST /api/ask` — 次のヒアリング質問を生成
- `POST /api/recommend` — ヒアリング結果から商品提案を生成
- `POST /api/explain` — 質問・選択肢に対する追加の説明を生成
- `POST /api/guide` — 質問に対する選び方ガイドを生成
- `POST /api/click` — アフィリエイト CTA のクリックログ（`sendBeacon` 経由）

すべての API には IP 単位のシンプルなレート制限（インメモリ・スライディングウィンドウ）が入っています。
Vercel の単一ラムダ内で動作するため、多数インスタンスで厳密な制限を行う場合は Upstash Redis / Vercel KV に置き換えてください
（`src/lib/rate-limit.ts` の `RateLimiter` インターフェイスにアダプタを差し込む構造になっています）。

クリックログは `src/lib/click-sink.ts` の `ClickSink` インターフェイスに差し替え可能です。
デフォルトは `console`（Vercel ログ / Loki / Datadog に拾われる）。KV に永続化したい場合は同ファイルの
`vercelKvSink` スタブを有効化してください。

## 解析

`NEXT_PUBLIC_ANALYTICS=vercel` または Vercel ホスティングでの実行時に、`@vercel/analytics` が自動で読み込まれます（opt-in）。

## ディレクトリ構成

```
src/
  app/
    page.tsx              # メインSPA（メモ一覧 / 質問 / 結果）
    layout.tsx            # メタデータ / 共通フッター
    _components/
      Disclosure.tsx      # 共通フッター（開示 + 法務リンク）
    privacy/page.tsx      # プライバシーポリシー
    terms/page.tsx        # 利用規約
    category/page.tsx     # カテゴリ一覧（SPAへ ?start= で誘導）
    chat/page.tsx         # 互換redirect: /?start=<q>
    result/page.tsx       # 互換redirect: /
    consult/page.tsx      # 互換redirect: /
    history/page.tsx      # 互換redirect: /
    api/
      ask/route.ts
      click/route.ts
      explain/route.ts
      guide/route.ts
      recommend/route.ts
  lib/
    rakuten.ts            # 楽天API adapter
    gemini.ts             # Gemini API adapter + ルールベースfallback
    categories.ts         # カテゴリ定義
    memos.ts              # メインSPAのメモ永続化
    history.ts            # ローカル履歴管理
    mock-products.ts      # デモ表示用の中立プレースホルダ
    types.ts              # 共通型
    url-safety.ts         # アフィリエイトURLの検証
    click-log.ts          # sendBeaconでクリック送信
    rate-limit.ts         # 各APIの簡易レート制限
```

## デプロイ (Vercel)

1. GitHubにpush
2. https://vercel.com で Import
3. 環境変数を設定
   - `GEMINI_API_KEY`
   - `RAKUTEN_APP_ID`
   - `RAKUTEN_ACCESS_KEY`
   - `RAKUTEN_AFFILIATE_ID`
   - `RAKUTEN_REFERER`（デプロイ先ドメインを楽天側の許可ドメインに登録した上で設定）
   - `NEXT_PUBLIC_SITE_URL`（任意、metadataに使用）
4. Deploy

## 法務

- 本サイトは楽天アフィリエイトプログラムを利用しています（フッターに開示）。
- `/privacy`（プライバシーポリシー）と `/terms`（利用規約）は骨子のみのテンプレートです。
  実運用に合わせて文言を見直してください。
