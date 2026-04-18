import { describe, it, expect, beforeEach } from "vitest"
import { loadMemos, saveMemos, newMemo, type Memo } from "@/lib/memos"

// Minimal localStorage polyfill for node test environment
class MemoryStorage {
  private store = new Map<string, string>()
  getItem(k: string) {
    return this.store.has(k) ? (this.store.get(k) as string) : null
  }
  setItem(k: string, v: string) {
    this.store.set(k, v)
  }
  removeItem(k: string) {
    this.store.delete(k)
  }
  clear() {
    this.store.clear()
  }
}

function primeStorage() {
  const ls = new MemoryStorage()
  Object.defineProperty(globalThis, "window", {
    value: {},
    configurable: true,
    writable: true
  })
  Object.defineProperty(globalThis, "localStorage", {
    value: ls,
    configurable: true,
    writable: true
  })
  // crypto is already provided by Node — do not override.
  return ls
}

function validMemoJson(over: Partial<Memo> = {}): Memo {
  const base = newMemo("テレビが欲しい")
  return { ...base, ...over }
}

describe("loadMemos shape validation", () => {
  beforeEach(() => primeStorage())

  it("returns [] when storage is empty", () => {
    expect(loadMemos()).toEqual([])
  })

  it("ignores non-array top-level JSON", () => {
    localStorage.setItem("kaimono:memos:v2", JSON.stringify({ broken: true }))
    expect(loadMemos()).toEqual([])
  })

  it("drops items missing required top-level fields", () => {
    localStorage.setItem(
      "kaimono:memos:v2",
      JSON.stringify([{ id: 1, text: "no numeric id" }])
    )
    expect(loadMemos()).toEqual([])
  })

  it("keeps valid items unchanged", () => {
    const m = validMemoJson()
    saveMemos([m])
    const loaded = loadMemos()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].id).toBe(m.id)
  })

  it("drops products with javascript: affiliate URLs", () => {
    const bad: Memo = validMemoJson({
      phase: "result",
      result: {
        summary_condition: "テレビ条件",
        selected: [
          {
            product_id: "x",
            one_liner: "テスト",
            fits: ["a"],
            unfits: ["b"],
            reason: "r",
            product: {
              id: "x",
              source: "rakuten",
              title: "t",
              price: 1000,
              imageUrl: "https://thumbnail.image.rakuten.co.jp/a.jpg",
              rating: 4.5,
              reviewCount: 10,
              shopName: "s",
              // javascript: URL must be dropped
              affiliateUrl: "javascript:alert(1)",
              caption: "c"
            }
          }
        ],
        notice: null,
        notices: []
      }
    })
    saveMemos([bad])
    const loaded = loadMemos()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].result?.selected).toHaveLength(0)
    // synthetic notice explains the drop
    expect(loaded[0].result?.notices?.some((n) => n.kind === "fallback-rank"))
      .toBe(true)
  })

  it("blanks http:// imageUrl to avoid mixed content", () => {
    const withHttpImg: Memo = validMemoJson({
      phase: "result",
      result: {
        summary_condition: "テレビ条件",
        selected: [
          {
            product_id: "x",
            one_liner: "テスト",
            fits: ["a"],
            unfits: ["b"],
            reason: "r",
            product: {
              id: "x",
              source: "rakuten",
              title: "t",
              price: 1000,
              imageUrl: "http://thumbnail.image.rakuten.co.jp/a.jpg",
              rating: 4.5,
              reviewCount: 10,
              shopName: "s",
              affiliateUrl: "https://item.rakuten.co.jp/shop/abc",
              caption: "c"
            }
          }
        ],
        notice: null,
        notices: []
      }
    })
    saveMemos([withHttpImg])
    const loaded = loadMemos()
    expect(loaded[0].result?.selected[0].product.imageUrl).toBe("")
  })

  it("merges legacy `notice` field into `notices[]`", () => {
    const raw = [
      {
        id: "a",
        text: "テレビ",
        createdAt: Date.now(),
        phase: "result",
        answers: [],
        result: {
          summary_condition: "テレビ条件",
          selected: [],
          notice: { kind: "mock", message: "demo" },
          notices: [] // array empty but legacy notice present
        },
        error: null
      }
    ]
    localStorage.setItem("kaimono:memos:v2", JSON.stringify(raw))
    const loaded = loadMemos()
    expect(loaded[0].result?.notices?.some((n) => n.kind === "mock")).toBe(true)
  })

  it("dedupes notices by kind when merging", () => {
    const raw = [
      {
        id: "a",
        text: "テレビ",
        createdAt: Date.now(),
        phase: "result",
        answers: [],
        result: {
          summary_condition: "テレビ条件",
          selected: [],
          notice: { kind: "mock", message: "legacy" },
          notices: [{ kind: "mock", message: "array" }]
        },
        error: null
      }
    ]
    localStorage.setItem("kaimono:memos:v2", JSON.stringify(raw))
    const loaded = loadMemos()
    const mocks = loaded[0].result?.notices?.filter((n) => n.kind === "mock") ?? []
    expect(mocks).toHaveLength(1)
  })
})
