import type { Metadata, Viewport } from "next"
import { Analytics } from "@vercel/analytics/react"
import "./globals.css"
import { Disclosure } from "./_components/Disclosure"

const ANALYTICS_ENABLED =
  process.env.NEXT_PUBLIC_ANALYTICS === "vercel" ||
  process.env.VERCEL === "1"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kaimono.example"

if (
  process.env.NODE_ENV === "production" &&
  (SITE_URL === "https://kaimono.example" || !process.env.NEXT_PUBLIC_SITE_URL)
) {
  console.warn(
    "[layout] NEXT_PUBLIC_SITE_URL is not set; OpenGraph / canonical URLs will use the placeholder. Set NEXT_PUBLIC_SITE_URL in production."
  )
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "かいもの相談 | AI買い物コンシェルジュ",
    template: "%s | かいもの相談"
  },
  description:
    "比較疲れしない、迷いを減らす買い物相談。AIがあなたに合う商品を2〜4件に絞って提案します。",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    title: "かいもの相談 | AI買い物コンシェルジュ",
    description:
      "比較疲れしない、迷いを減らす買い物相談。AIがあなたに合う商品を2〜4件に絞って提案します。"
  },
  twitter: {
    card: "summary",
    title: "かいもの相談 | AI買い物コンシェルジュ"
  },
  robots: { index: true, follow: true }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f97316"
}

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "かいもの相談",
  url: SITE_URL,
  inLanguage: "ja",
  description:
    "比較疲れしない、迷いを減らす買い物相談。AIがあなたに合う商品を2〜4件に絞って提案します。",
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/?start={search_term_string}`,
    "query-input": "required name=search_term_string"
  }
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        {children}
        <Disclosure />
        {ANALYTICS_ENABLED && <Analytics />}
      </body>
    </html>
  )
}
