import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "プライバシーポリシー | かいもの相談",
  description:
    "かいもの相談でどのような情報を扱うかを説明しています。アクセス解析・アフィリエイトプログラムの利用についても記載しています。"
}

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh max-w-xl mx-auto px-6 py-10">
      <Link href="/" className="btn-ghost mb-4 inline-flex">
        ← メモに戻る
      </Link>
      <h1 className="text-2xl font-bold text-ink-900 mb-6">
        プライバシーポリシー
      </h1>
      <div className="space-y-5 text-[14px] text-ink-700 leading-relaxed">
        <section>
          <h2 className="font-semibold text-ink-900 mb-1">1. 取得する情報</h2>
          <p>
            本サービス「かいもの相談」（以下「本サービス」）は、ユーザーが入力した買い物相談のテキストを、AIによる質問生成と商品提案のために処理します。
            入力内容はブラウザのローカルストレージに保存され、端末内に留まります。
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-ink-900 mb-1">2. 外部サービスへの送信</h2>
          <p>
            AI提案のため、ユーザーの入力内容および回答を Google の Gemini API に送信します。
            また、商品検索のため楽天市場 API（Ichiba Item Search）に対し、AIが生成した検索語を送信します。
            これらの外部サービスには、ユーザーが自由入力欄に記述した文字列がそのまま送信される可能性があります。
            <strong>氏名・住所・電話番号・メールアドレス・クレジットカード番号などの個人情報は入力欄に記入しないでください。</strong>
            本サービス自体は、会員登録・決済等の個人情報取得機能を持ちません。
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-ink-900 mb-1">3. Cookie とアクセス解析</h2>
          <p>
            本サービスは、サービス改善のためアクセス解析ツール（例: Vercel Analytics）を利用することがあります。
            解析ツールは Cookie や IP アドレス等を匿名の形で収集します。
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-ink-900 mb-1">4. アフィリエイトプログラム</h2>
          <p>
            本サービスは、楽天アフィリエイトプログラム等の第三者のアフィリエイトプログラムに参加しています。
            商品リンクから購入が発生した場合、紹介料を得ることがあります。
            紹介料の有無は、表示される商品情報・順位には影響しません。
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-ink-900 mb-1">5. データの削除</h2>
          <p>
            ブラウザの履歴・サイトデータを削除することで、端末内に保存された相談履歴を消去できます。
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-ink-900 mb-1">6. お問い合わせ</h2>
          <p>
            本ポリシーに関するお問い合わせは、運営者までご連絡ください。
          </p>
        </section>
        <p className="text-[12px] text-ink-500">
          最終更新日: 2026年4月
        </p>
      </div>
    </main>
  )
}
