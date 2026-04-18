import { describe, it, expect, vi, beforeEach } from "vitest"
import type { Product } from "@/lib/types"

// Replace the network fetch that searchRakuten uses with a scripted sequence
// so we can prove each relaxation level kicks in.
const fetchMock = vi.fn()
vi.stubGlobal("fetch", fetchMock)

import { searchRakutenRelaxed } from "@/lib/rakuten"

// Arrange env so searchRakuten() passes its required-env guard.
process.env.RAKUTEN_APP_ID = "test"
process.env.RAKUTEN_ACCESS_KEY = "test"

function rakutenResponse(items: { itemCode: string; itemName: string; itemPrice: number; affiliateUrl?: string }[]) {
  return {
    ok: true,
    headers: new Headers({ "content-type": "application/json" }),
    status: 200,
    statusText: "OK",
    json: async () => ({
      Items: items.map((i) => ({
        Item: {
          itemName: i.itemName,
          itemPrice: i.itemPrice,
          itemCode: i.itemCode,
          itemUrl: "https://item.rakuten.co.jp/shop/" + i.itemCode,
          affiliateUrl:
            i.affiliateUrl ?? "https://hb.afl.rakuten.co.jp/" + i.itemCode,
          mediumImageUrls: [{ imageUrl: "https://thumbnail.image.rakuten.co.jp/x.jpg" }],
          reviewAverage: 4.3,
          reviewCount: 200,
          shopName: "shop",
          itemCaption: "caption"
        }
      }))
    })
  } as unknown as Response
}

function emptyResponse() {
  return rakutenResponse([])
}

function hasItem(itemCode: string): Product {
  return { id: itemCode } as unknown as Product
}

describe("searchRakutenRelaxed", () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  it("returns level 0 when first call yields items", async () => {
    fetchMock.mockResolvedValueOnce(
      rakutenResponse([{ itemCode: "a", itemName: "A", itemPrice: 1000 }])
    )
    const out = await searchRakutenRelaxed({ keyword: "foo bar baz", minPrice: 100 })
    expect(out.relaxedLevel).toBe(0)
    expect(out.items.map((i) => i.id)).toEqual(["a"])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("drops price range when first call is empty", async () => {
    fetchMock
      .mockResolvedValueOnce(emptyResponse())
      .mockResolvedValueOnce(
        rakutenResponse([{ itemCode: "b", itemName: "B", itemPrice: 1000 }])
      )
    const out = await searchRakutenRelaxed({
      keyword: "foo bar baz",
      minPrice: 100,
      maxPrice: 200
    })
    expect(out.relaxedLevel).toBe(1)
    expect(out.droppedFilters).toEqual(["price"])
    // second call should have no minPrice / maxPrice in the URL
    const secondUrl = fetchMock.mock.calls[1][0] as string
    expect(secondUrl).not.toMatch(/minPrice/)
    expect(secondUrl).not.toMatch(/maxPrice/)
  })

  it("drops ngKeyword at level 2", async () => {
    fetchMock
      .mockResolvedValueOnce(emptyResponse())
      .mockResolvedValueOnce(emptyResponse())
      .mockResolvedValueOnce(
        rakutenResponse([{ itemCode: "c", itemName: "C", itemPrice: 1000 }])
      )
    const out = await searchRakutenRelaxed({
      keyword: "foo bar baz",
      minPrice: 100,
      maxPrice: 200,
      ngKeyword: "exclude"
    })
    expect(out.relaxedLevel).toBe(2)
    expect(out.droppedFilters).toEqual(["price", "ngKeyword"])
    const thirdUrl = fetchMock.mock.calls[2][0] as string
    expect(thirdUrl).not.toMatch(/NGKeyword/)
  })

  it("shortens keyword at level 3", async () => {
    fetchMock
      .mockResolvedValueOnce(emptyResponse())
      .mockResolvedValueOnce(emptyResponse())
      .mockResolvedValueOnce(emptyResponse())
      .mockResolvedValueOnce(
        rakutenResponse([{ itemCode: "d", itemName: "D", itemPrice: 1000 }])
      )
    const out = await searchRakutenRelaxed({
      keyword: "肌触り やわらか バスタオル 高級",
      minPrice: 100,
      maxPrice: 200,
      ngKeyword: "exclude"
    })
    expect(out.relaxedLevel).toBe(3)
    expect(out.droppedFilters).toEqual(["price", "ngKeyword", "keywordTail"])
    const lastUrl = fetchMock.mock.calls[3][0] as string
    // keyword should have been shortened to first two tokens
    expect(decodeURIComponent(lastUrl)).toMatch(/keyword=肌触り\+やわらか/)
  })

  it("returns empty at level 3 when every relaxation still fails", async () => {
    fetchMock
      .mockResolvedValueOnce(emptyResponse())
      .mockResolvedValueOnce(emptyResponse())
      .mockResolvedValueOnce(emptyResponse())
      .mockResolvedValueOnce(emptyResponse())
    const out = await searchRakutenRelaxed({
      keyword: "zzz zzz zzz",
      minPrice: 100,
      ngKeyword: "exclude"
    })
    expect(out.relaxedLevel).toBe(3)
    expect(out.items).toHaveLength(0)
    hasItem("unused") // keep TS happy about unused import
  })
})
