import { describe, it, expect } from "vitest"
import { isKeywordGenuineInTitle, filterByRelevance } from "@/lib/relevance"
import type { Product } from "@/lib/types"

describe("isKeywordGenuineInTitle", () => {
  it("rejects リップ inside ドリップコーヒー", () => {
    expect(
      isKeywordGenuineInTitle(
        "ドリップコーヒー 150袋 9g 個包装 ドリップバッグ",
        "リップ"
      )
    ).toBe(false)
  })

  it("accepts リップ when preceded by space (リップモンスター)", () => {
    expect(
      isKeywordGenuineInTitle(
        "カネボウ ケイト リップモンスター",
        "リップ"
      )
    ).toBe(true)
  })

  it("accepts リップ in space-separated cosmetics title", () => {
    expect(
      isKeywordGenuineInTitle(
        "YSL ラブシャイン キャンディグレーズ / リップ 口紅",
        "リップ"
      )
    ).toBe(true)
  })

  it("accepts テレビ after kanji 液晶", () => {
    expect(isKeywordGenuineInTitle("液晶テレビ 55型", "テレビ")).toBe(true)
  })

  it("passes long keywords through without filtering", () => {
    expect(
      isKeywordGenuineInTitle(
        "よく分からないタイトル フラットテレビ 4K",
        "フラットテレビ"
      )
    ).toBe(true)
  })

  it("passes non-katakana keywords through unchanged", () => {
    expect(isKeywordGenuineInTitle("電気ケトル 1L", "電気")).toBe(true)
    expect(isKeywordGenuineInTitle("電気ケトル 1L", "電子")).toBe(false)
  })
})

function product(title: string): Product {
  return {
    id: title,
    source: "rakuten",
    title,
    price: 1000,
    imageUrl: "https://img/x.jpg",
    rating: 4,
    reviewCount: 10,
    shopName: "s",
    affiliateUrl: "https://item.rakuten.co.jp/x",
    caption: ""
  }
}

describe("filterByRelevance", () => {
  it("removes ドリップコーヒー / ドリップバッグ when searching リップ", () => {
    const items = [
      product("ドリップコーヒー 150袋"),
      product("YSL リップ 口紅"),
      product("カネボウ ケイト リップモンスター"),
      product("スリップ防止マット")
    ]
    const out = filterByRelevance(items, "リップ")
    expect(out.map((p) => p.title)).toEqual([
      "YSL リップ 口紅",
      "カネボウ ケイト リップモンスター"
    ])
  })

  it("is a no-op for non-katakana keywords (trusts Rakuten's match)", () => {
    const items = [
      product("電気ケトル 1L"),
      product("電動ドリル（汎用）")
    ]
    // "電気" is kanji — filter passes everything through, substring collisions
    // are rare enough with kanji that we don't try to second-guess Rakuten.
    const out = filterByRelevance(items, "電気")
    expect(out).toHaveLength(2)
  })

  it("requires all short katakana tokens to be genuine matches", () => {
    const items = [
      product("リップ バーム しっとり"), // legit: contains リップ as token, no バーム substring issue
      product("ドリップ バーム") // fake: リップ is inside ドリップ
    ]
    const out = filterByRelevance(items, "リップ バーム")
    expect(out.map((p) => p.title)).toEqual(["リップ バーム しっとり"])
  })
})
