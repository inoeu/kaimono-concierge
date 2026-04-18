import Link from "next/link"

export function Disclosure() {
  return (
    <footer className="px-5 py-4 text-[11px] text-ink-600 leading-relaxed border-t border-paper-200 bg-paper-100">
      <p className="mb-1">
        本サイトは楽天アフィリエイトプログラム等に参加しており、商品リンクから購入が発生した場合、
        運営者が紹介料を得ることがあります（商品情報そのものに影響はありません）。
      </p>
      <nav className="flex flex-wrap gap-3 mt-2">
        <Link href="/privacy" className="underline hover:text-ink-800">
          プライバシーポリシー
        </Link>
        <Link href="/terms" className="underline hover:text-ink-800">
          利用規約
        </Link>
      </nav>
    </footer>
  )
}
