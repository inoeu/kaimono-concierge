import Link from "next/link"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import {
  allCategoryItems,
  categories,
  findCategory,
  type CategoryItem
} from "@/lib/categories"

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://kaimono.example"

export async function generateStaticParams() {
  return allCategoryItems().map((i) => ({ slug: i.slug }))
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const item = findCategory(slug)
  if (!item) return { title: "ページが見つかりません" }
  const title = `${item.label}の選び方 | かいもの相談`
  const description = `${item.label}をどう選ぶか、短い観点と予算の目安、AIコンシェルジュとの相談導線までまとめました。${item.intro}`
  const path = `/category/${item.slug}`
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      title,
      description,
      url: path
    }
  }
}

export default async function CategoryLanding({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const item = findCategory(slug)
  if (!item) notFound()

  const group = categories.find((g) => g.items.some((i) => i.slug === slug))
  const related = (item.related ?? [])
    .map((label) =>
      allCategoryItems().find((i) => i.label === label)
    )
    .filter((x): x is CategoryItem => !!x)

  const startUrl = `/?start=${encodeURIComponent(`${item.label}を探したい`)}`

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "ホーム",
            item: `${SITE_URL}/`
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "カテゴリから探す",
            item: `${SITE_URL}/category`
          },
          {
            "@type": "ListItem",
            position: 3,
            name: `${item.label}の選び方`,
            item: `${SITE_URL}/category/${item.slug}`
          }
        ]
      },
      {
        "@type": "Article",
        headline: `${item.label}の選び方`,
        description: item.intro,
        inLanguage: "ja",
        about: item.label,
        mainEntityOfPage: `${SITE_URL}/category/${item.slug}`
      },
      {
        "@type": "FAQPage",
        mainEntity: item.points.slice(0, 4).map((p, i) => ({
          "@type": "Question",
          name: `${item.label}を選ぶときの観点${i + 1}は？`,
          acceptedAnswer: { "@type": "Answer", text: p }
        }))
      }
    ]
  }

  return (
    <main className="min-h-dvh max-w-2xl mx-auto px-6 py-8">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="text-[11px] text-ink-500 mb-4" aria-label="パンくず">
        <Link href="/" className="hover:text-ink-800">
          ホーム
        </Link>
        <span className="mx-2 text-ink-300">/</span>
        <Link href="/category" className="hover:text-ink-800">
          カテゴリ
        </Link>
        <span className="mx-2 text-ink-300">/</span>
        <span className="text-ink-700">{item.label}</span>
      </nav>

      <h1 className="text-2xl font-bold text-ink-900 tracking-tight mb-3">
        {item.label}の選び方
      </h1>
      <p className="text-[14px] text-ink-700 leading-relaxed mb-6">
        {item.intro}
      </p>

      <Link href={startUrl} className="btn-primary inline-flex mb-10">
        AIと相談を始める →
      </Link>

      <section className="mb-10">
        <h2 className="text-[13px] uppercase tracking-[0.15em] text-ink-500 mb-3">
          選ぶときの観点
        </h2>
        <ul className="space-y-3">
          {item.points.map((p, i) => (
            <li
              key={i}
              className="rounded-xl bg-paper-100 px-4 py-3 text-[14px] text-ink-800 leading-relaxed"
            >
              <span className="text-ink-500 mr-2">#{i + 1}</span>
              {p}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-[13px] uppercase tracking-[0.15em] text-ink-500 mb-3">
          価格帯の目安
        </h2>
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {item.budgets.map((b) => (
            <li
              key={b.label}
              className="rounded-xl border border-paper-200 px-4 py-3"
            >
              <div className="text-[11px] uppercase tracking-[0.15em] text-ink-500 mb-1">
                {b.label}
              </div>
              <div className="text-[15px] font-semibold text-ink-900">
                {b.range}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {related.length > 0 && (
        <section className="mb-10">
          <h2 className="text-[13px] uppercase tracking-[0.15em] text-ink-500 mb-3">
            関連して迷われるもの
          </h2>
          <ul className="flex flex-wrap gap-2">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/category/${r.slug}`}
                  className="chip text-[12px]"
                >
                  {r.label}の選び方
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-10">
        <h2 className="text-[13px] uppercase tracking-[0.15em] text-ink-500 mb-3">
          AIコンシェルジュに相談する
        </h2>
        <p className="text-[13px] text-ink-700 leading-relaxed mb-4">
          {item.label}は人によって重視する条件が違うため、短い質問で条件を整理したうえで、
          楽天市場から 2〜4 件に絞って比較できるようにしています。
          条件に合わない商品は結果画面で「向いていない人」として明示します。
        </p>
        <Link href={startUrl} className="btn-primary inline-flex">
          {item.label}について相談を始める →
        </Link>
      </section>

      {group && (
        <section className="mt-12 pt-8 border-t border-paper-200">
          <h2 className="text-[11px] uppercase tracking-[0.15em] text-ink-500 mb-3">
            同じカテゴリ（{group.title}）
          </h2>
          <ul className="grid grid-cols-2 gap-2">
            {group.items
              .filter((i) => i.slug !== item.slug)
              .map((i) => (
                <li key={i.slug}>
                  <Link
                    href={`/category/${i.slug}`}
                    className="block text-[13px] text-ink-700 hover:text-ink-900 hover:underline py-1"
                  >
                    {i.label}の選び方
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      )}
    </main>
  )
}
