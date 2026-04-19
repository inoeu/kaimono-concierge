import { describe, it, expect } from "vitest"
import { fallbackKeyword, fallbackRank } from "@/lib/gemini"
import type { Product } from "@/lib/types"

function demo(
  id: string,
  overrides: Partial<Product> = {}
): Product {
  return {
    id,
    source: "rakuten",
    title: `${id}のテレビ`,
    price: 40_000,
    imageUrl: "https://img/example.jpg",
    rating: 4.3,
    reviewCount: 100,
    shopName: "shop",
    affiliateUrl: "https://item.rakuten.co.jp/x",
    caption: "caption",
    ...overrides
  }
}

describe("fallbackKeyword", () => {
  it("returns 'おすすめ' for blank input", () => {
    expect(fallbackKeyword("")).toBe("おすすめ")
  })

  it("strips URLs and trims length", () => {
    const out = fallbackKeyword(
      "テレビが欲しい https://example.com/very-long/path/here"
    )
    expect(out).not.toMatch(/https?:/i)
    expect(out.length).toBeLessThanOrEqual(40)
  })

  it("converts 、 and , to space", () => {
    const out = fallbackKeyword("テレビ、4K、安め")
    expect(out).toMatch(/テレビ/)
    expect(out).not.toMatch(/、/)
  })

  it("expands well-known single katakana tokens", () => {
    expect(fallbackKeyword("リップ")).toBe("リップ 口紅")
    expect(fallbackKeyword("シャンプー")).toBe("シャンプー ヘアケア")
    expect(fallbackKeyword("カメラ")).toBe("カメラ 本体")
  })

  it("does not expand when user already provided multiple words", () => {
    expect(fallbackKeyword("リップ クリーム")).toBe("リップ クリーム")
  })

  it("does not expand unknown tokens", () => {
    expect(fallbackKeyword("ガジェット")).toBe("ガジェット")
  })
})

describe("fallbackRank", () => {
  it("drops items with no signal (rating==0 and reviewCount==0)", () => {
    const signal = demo("signal", { rating: 4.5, reviewCount: 300 })
    const noSignal = demo("nosignal", { rating: 0, reviewCount: 0 })
    const out = fallbackRank({
      userInput: "テレビ",
      answers: [],
      candidates: [noSignal, signal]
    })
    expect(out.selected.map((s) => s.product_id)).not.toContain("nosignal")
  })

  it("uses neutral wording for items without rating", () => {
    const unrated = demo("u", { rating: 0, reviewCount: 30 })
    const out = fallbackRank({
      userInput: "テレビ",
      answers: [],
      candidates: [unrated]
    })
    // should mention review count but not claim "高評価"
    const joined = out.selected.flatMap((s) => s.fits).join(" ")
    expect(joined).not.toContain("★0.0")
  })

  it("respects price range: over-budget is penalised more than under", () => {
    const overBudget = demo("over", { price: 200_000 })
    const underBudget = demo("under", { price: 5_000 })
    const inBudget = demo("in", { price: 40_000 })
    const out = fallbackRank(
      {
        userInput: "テレビ",
        answers: [],
        candidates: [overBudget, underBudget, inBudget]
      },
      { minPrice: 20_000, maxPrice: 60_000 }
    )
    const ids = out.selected.map((s) => s.product_id)
    // in-budget and under-budget should both out-rank the blown-budget one
    expect(ids.indexOf("in")).toBeLessThan(ids.indexOf("over"))
  })
})
