import type { Product } from "./types"

// すべて「デモ用のプレースホルダ」です。実在する型番・価格・保証内容は含めません。
// affiliateUrl は楽天の検索結果トップページに誘導するだけの安全な URL にしています。
const DEMO_AFFILIATE = "https://search.rakuten.co.jp/search/mall/"

function demoUrl(keyword: string): string {
  return `${DEMO_AFFILIATE}${encodeURIComponent(keyword)}/`
}

export function getMockProducts(keyword: string): Product[] {
  const lower = keyword.toLowerCase()

  if (lower.includes("テレビ") || lower.includes("tv")) {
    return [
      demo("mock-tv-1", "【デモ】コンパクト4Kテレビ", 39800, 4.4, 1800, demoUrl("4Kテレビ"),
        "デモ表示: 実在商品ではありません。本番環境では楽天の検索結果が並びます。"),
      demo("mock-tv-2", "【デモ】中サイズ4Kテレビ", 49800, 4.3, 950, demoUrl("4Kテレビ"),
        "デモ表示: 実在商品ではありません。"),
      demo("mock-tv-3", "【デモ】エントリー液晶テレビ", 29800, 4.5, 2100, demoUrl("液晶テレビ"),
        "デモ表示: 実在商品ではありません。"),
      demo("mock-tv-4", "【デモ】大画面プレミアムテレビ", 178000, 4.7, 412, demoUrl("有機ELテレビ"),
        "デモ表示: 実在商品ではありません。")
    ]
  }

  if (lower.includes("炊飯") || lower.includes("ごはん") || lower.includes("ライス")) {
    return [
      demo("mock-rice-1", "【デモ】標準サイズの炊飯器", 14800, 4.4, 3200, demoUrl("炊飯器"),
        "デモ表示: 実在商品ではありません。"),
      demo("mock-rice-2", "【デモ】一人暮らし向け炊飯器", 8980, 4.3, 1800, demoUrl("炊飯器 3合"),
        "デモ表示: 実在商品ではありません。"),
      demo("mock-rice-3", "【デモ】圧力IHの上位モデル", 42800, 4.6, 890, demoUrl("圧力IH 炊飯器"),
        "デモ表示: 実在商品ではありません。")
    ]
  }

  return [
    demo("mock-gen-1", `【デモ】${keyword} 代表的モデル`, 15800, 4.3, 1500, demoUrl(keyword),
      "デモ表示: 実在商品ではありません。楽天APIが利用可能になると、実際の商品が並びます。"),
    demo("mock-gen-2", `【デモ】${keyword} ワンランク上モデル`, 32800, 4.5, 680, demoUrl(keyword),
      "デモ表示: 実在商品ではありません。"),
    demo("mock-gen-3", `【デモ】${keyword} エントリーモデル`, 7980, 4.1, 2300, demoUrl(keyword),
      "デモ表示: 実在商品ではありません。")
  ]
}

function demo(
  id: string,
  title: string,
  price: number,
  rating: number,
  reviewCount: number,
  affiliateUrl: string,
  caption: string
): Product {
  return {
    id,
    source: "rakuten",
    title,
    price,
    imageUrl: "",
    rating,
    reviewCount,
    shopName: "デモ表示",
    affiliateUrl,
    caption
  }
}
