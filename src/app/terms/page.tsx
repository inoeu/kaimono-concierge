import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "利用規約 | かいもの相談",
  description: "かいもの相談の利用規約です。利用条件、禁止事項、免責事項などを記載しています。"
}

export default function TermsPage() {
  return (
    <main className="min-h-dvh max-w-xl mx-auto px-6 py-10">
      <Link href="/" className="btn-ghost mb-4 inline-flex">
        ← メモに戻る
      </Link>
      <h1 className="text-2xl font-bold text-ink-900 mb-6">利用規約</h1>
      <div className="space-y-5 text-[14px] text-ink-700 leading-relaxed">
        <section>
          <h2 className="font-semibold text-ink-900 mb-1">1. サービス内容</h2>
          <p>
            「かいもの相談」（以下「本サービス」）は、AIが質問を通じて条件を整理し、楽天市場等の外部APIから商品候補を提示する買い物相談サービスです。
            提示される情報は参考情報であり、正確性・最新性・在庫を保証するものではありません。
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-ink-900 mb-1">2. 免責事項</h2>
          <p>
            本サービスが提示する商品情報、価格、評価、購入先リンクは、外部APIから取得した時点の情報です。
            購入前に必ず販売ページで最新の情報をご確認ください。
            商品の選定・購入によって発生した損害について、本サービスは一切の責任を負いません。
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-ink-900 mb-1">3. 禁止事項</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>本サービスのAIエンドポイントへの過度なリクエスト、自動スクレイピング</li>
            <li>本サービスを用いた違法行為、第三者の権利侵害</li>
            <li>本サービスの運営を妨げる行為</li>
          </ul>
        </section>
        <section>
          <h2 className="font-semibold text-ink-900 mb-1">4. アフィリエイトリンク</h2>
          <p>
            商品リンクには楽天アフィリエイトプログラム等の紹介リンクが含まれることがあります。
            詳細は<Link href="/privacy" className="underline"> プライバシーポリシー </Link>をご確認ください。
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-ink-900 mb-1">5. 規約の変更</h2>
          <p>
            本規約は予告なく変更されることがあります。変更後も本サービスを利用した場合、変更後の規約に同意したものとみなします。
          </p>
        </section>
        <p className="text-[12px] text-ink-500">最終更新日: 2026年4月</p>
      </div>
    </main>
  )
}
