import Link from "next/link"
import type { Metadata } from "next"
import { categories } from "@/lib/categories"

export const metadata: Metadata = {
  title: "カテゴリから探す",
  description:
    "キッチン家電・生活家電・PC・ガジェットなどのカテゴリから、AI買い物コンシェルジュが選び方を案内します。"
}

export default function CategoryPage() {
  return (
    <main className="min-h-dvh max-w-xl mx-auto">
      <header className="flex items-center justify-between px-6 pt-6 pb-3">
        <Link href="/" className="btn-ghost">
          ← メモに戻る
        </Link>
        <div className="text-[13px] font-semibold text-ink-800">
          カテゴリから探す
        </div>
        <span className="w-20" />
      </header>

      <section className="px-6 pb-12">
        <p className="text-sm text-ink-600 mb-8">
          気になるジャンルを選ぶと、選び方の観点と相談の入り口を表示します。
        </p>

        <div className="space-y-8">
          {categories.map((group) => (
            <div key={group.title}>
              <div className="text-[11px] uppercase tracking-[0.15em] text-ink-500 mb-3">
                {group.title}
              </div>
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={`/category/${item.slug}`}
                      className="option-row"
                    >
                      <span className="check-circle" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[15px] text-ink-900 leading-tight">
                          {item.label}
                        </span>
                        <span className="block text-[12px] text-ink-500 mt-1 leading-snug line-clamp-1">
                          {item.intro}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/" className="text-xs text-ink-500 hover:text-ink-800">
            自由に書くに戻る
          </Link>
        </div>
      </section>
    </main>
  )
}
