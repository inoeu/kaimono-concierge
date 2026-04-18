import { describe, it, expect, vi, beforeEach } from "vitest"
import type { Product } from "@/lib/types"

// ---- mocks ----
vi.mock("@/lib/gemini", async () => {
  const actual = await vi.importActual<typeof import("@/lib/gemini")>(
    "@/lib/gemini"
  )
  return {
    ...actual,
    generateSearchQuery: vi.fn(),
    rankProducts: vi.fn()
  }
})

vi.mock("@/lib/rakuten", () => ({
  searchRakuten: vi.fn()
}))

import { generateSearchQuery, rankProducts } from "@/lib/gemini"
import { searchRakuten } from "@/lib/rakuten"
import { POST } from "@/app/api/recommend/route"

function product(id: string, over: Partial<Product> = {}): Product {
  return {
    id,
    source: "rakuten",
    title: `${id} 4Kテレビ`,
    price: 49_800,
    imageUrl: "https://thumbnail.image.rakuten.co.jp/a.jpg",
    rating: 4.3,
    reviewCount: 200,
    shopName: "shop",
    affiliateUrl: "https://item.rakuten.co.jp/shop/" + id,
    caption: "caption",
    ...over
  }
}

function req(ip: string, body: unknown): Request {
  return new Request("http://example.com/api/recommend", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip
    },
    body: JSON.stringify(body)
  })
}

async function jsonOf(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>
}

describe("/api/recommend branches", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("happy path: no notices, 4 products", async () => {
    vi.mocked(generateSearchQuery).mockResolvedValue({
      query: { keyword: "4Kテレビ" },
      fallback: false
    })
    vi.mocked(searchRakuten).mockResolvedValue([
      product("a"),
      product("b"),
      product("c"),
      product("d"),
      product("e")
    ])
    vi.mocked(rankProducts).mockResolvedValue({
      summary_condition: "4Kテレビで予算5万円以内",
      selected: [
        { product_id: "a", one_liner: "定番", fits: ["a"], unfits: ["b"], reason: "r" },
        { product_id: "b", one_liner: "標準", fits: ["a"], unfits: ["b"], reason: "r" },
        { product_id: "c", one_liner: "高コスパ", fits: ["a"], unfits: ["b"], reason: "r" },
        { product_id: "d", one_liner: "プレミア", fits: ["a"], unfits: ["b"], reason: "r" }
      ]
    })

    const r = await POST(req("1.1.1.1", { userInput: "テレビ" }))
    const body = await jsonOf(r)
    expect(body.notices).toEqual([])
    expect(body.selected).toHaveLength(4)
    expect(body.summary_condition).toContain("4Kテレビ")
  })

  it("emits fallback-search notice when generateSearchQuery falls back", async () => {
    vi.mocked(generateSearchQuery).mockResolvedValue({
      query: { keyword: "テレビ" },
      fallback: true
    })
    vi.mocked(searchRakuten).mockResolvedValue([
      product("a"),
      product("b")
    ])
    vi.mocked(rankProducts).mockResolvedValue({
      summary_condition: "テレビ",
      selected: [
        { product_id: "a", one_liner: "x", fits: ["a"], unfits: ["b"], reason: "r" },
        { product_id: "b", one_liner: "y", fits: ["a"], unfits: ["b"], reason: "r" }
      ]
    })

    const r = await POST(req("1.1.1.2", { userInput: "テレビ" }))
    const body = await jsonOf(r)
    const notices = body.notices as Array<{ kind: string }>
    expect(notices.some((n) => n.kind === "fallback-search")).toBe(true)
  })

  it("emits mock notice when Rakuten fails", async () => {
    vi.mocked(generateSearchQuery).mockResolvedValue({
      query: { keyword: "テレビ" },
      fallback: false
    })
    vi.mocked(searchRakuten).mockRejectedValue(new Error("rakuten down"))
    vi.mocked(rankProducts).mockResolvedValue({
      summary_condition: "テレビ",
      selected: [
        {
          product_id: "mock-tv-1",
          one_liner: "x",
          fits: ["a"],
          unfits: ["b"],
          reason: "r"
        }
      ]
    })

    const r = await POST(req("1.1.1.3", { userInput: "テレビが欲しい" }))
    const body = await jsonOf(r)
    const notices = body.notices as Array<{ kind: string }>
    expect(notices.some((n) => n.kind === "mock")).toBe(true)
  })

  it("emits empty notice when no candidates even after mock", async () => {
    vi.mocked(generateSearchQuery).mockResolvedValue({
      query: { keyword: "zzz_nonsense_xxx" },
      fallback: false
    })
    vi.mocked(searchRakuten).mockResolvedValue([])

    const r = await POST(req("1.1.1.4", { userInput: "zzz_nonsense_xxx" }))
    const body = await jsonOf(r)
    // With a nonsense keyword, mock products may still return a generic
    // fallback list. If so we should see `mock`; if not we see `empty`.
    const notices = body.notices as Array<{ kind: string }>
    expect(
      notices.some((n) => n.kind === "mock" || n.kind === "empty")
    ).toBe(true)
  })

  it("emits fallback-rank when LLM returns no valid product_ids", async () => {
    vi.mocked(generateSearchQuery).mockResolvedValue({
      query: { keyword: "テレビ" },
      fallback: false
    })
    vi.mocked(searchRakuten).mockResolvedValue([
      product("real-a"),
      product("real-b")
    ])
    vi.mocked(rankProducts).mockResolvedValue({
      summary_condition: "テレビ",
      selected: [
        { product_id: "ghost-1", one_liner: "x", fits: ["a"], unfits: ["b"], reason: "r" },
        { product_id: "ghost-2", one_liner: "y", fits: ["a"], unfits: ["b"], reason: "r" }
      ]
    })

    const r = await POST(req("1.1.1.5", { userInput: "テレビ" }))
    const body = await jsonOf(r)
    const notices = body.notices as Array<{ kind: string }>
    expect(notices.some((n) => n.kind === "fallback-rank")).toBe(true)
    const selected = body.selected as Array<{ product_id: string }>
    // Top-up with real candidates
    expect(selected.length).toBeGreaterThan(0)
    for (const s of selected) {
      expect(["real-a", "real-b"]).toContain(s.product_id)
    }
  })

  it("does not emit fallback-rank for natural overflow (5+ valid items)", async () => {
    vi.mocked(generateSearchQuery).mockResolvedValue({
      query: { keyword: "テレビ" },
      fallback: false
    })
    const cands = ["a", "b", "c", "d", "e", "f"].map((id) => product(id))
    vi.mocked(searchRakuten).mockResolvedValue(cands)
    vi.mocked(rankProducts).mockResolvedValue({
      summary_condition: "テレビ",
      selected: cands.map((c) => ({
        product_id: c.id,
        one_liner: c.id,
        fits: ["a"],
        unfits: ["b"],
        reason: "r"
      }))
    })

    const r = await POST(req("1.1.1.6", { userInput: "テレビ" }))
    const body = await jsonOf(r)
    const notices = (body.notices ?? []) as Array<{ kind: string }>
    expect(notices.some((n) => n.kind === "fallback-rank")).toBe(false)
    const selected = body.selected as unknown[]
    expect(selected).toHaveLength(4)
  })

  it("rate-limits repeated requests from the same IP", async () => {
    vi.mocked(generateSearchQuery).mockResolvedValue({
      query: { keyword: "テレビ" },
      fallback: false
    })
    vi.mocked(searchRakuten).mockResolvedValue([product("a"), product("b")])
    vi.mocked(rankProducts).mockResolvedValue({
      summary_condition: "テレビ",
      selected: [
        { product_id: "a", one_liner: "x", fits: ["a"], unfits: ["b"], reason: "r" },
        { product_id: "b", one_liner: "y", fits: ["a"], unfits: ["b"], reason: "r" }
      ]
    })
    // /api/recommend limit is 10 per 60s. 11 requests ⇒ last one 429.
    const results: number[] = []
    for (let i = 0; i < 11; i++) {
      const r = await POST(req("9.9.9.9", { userInput: "テレビ" }))
      results.push(r.status)
    }
    expect(results.filter((s) => s === 429).length).toBeGreaterThan(0)
  })
})
