import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { logAffiliateClick } from "@/lib/click-log"

describe("logAffiliateClick", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "window", {
      value: {},
      configurable: true,
      writable: true
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("uses sendBeacon when available and it returns true", () => {
    const sendBeacon = vi.fn().mockReturnValue(true)
    const fetchMock = vi.fn().mockResolvedValue(new Response())
    vi.stubGlobal("navigator", { sendBeacon } as unknown as Navigator)
    vi.stubGlobal("fetch", fetchMock)

    logAffiliateClick({
      product_id: "p",
      placement: "result",
      keyword: "k"
    })

    expect(sendBeacon).toHaveBeenCalledOnce()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("falls back to fetch(keepalive) when sendBeacon returns false", () => {
    const sendBeacon = vi.fn().mockReturnValue(false)
    const fetchMock = vi.fn().mockResolvedValue(new Response())
    vi.stubGlobal("navigator", { sendBeacon } as unknown as Navigator)
    vi.stubGlobal("fetch", fetchMock)

    logAffiliateClick({
      product_id: "p",
      placement: "result"
    })

    expect(sendBeacon).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledOnce()
    const [, init] = fetchMock.mock.calls[0] as [
      string,
      { keepalive?: boolean }
    ]
    expect(init.keepalive).toBe(true)
  })

  it("falls back to fetch when sendBeacon is missing", () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response())
    vi.stubGlobal("navigator", {} as unknown as Navigator)
    vi.stubGlobal("fetch", fetchMock)

    logAffiliateClick({
      product_id: "p",
      placement: "result"
    })

    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it("never throws, even when everything fails", () => {
    vi.stubGlobal("navigator", {
      sendBeacon: () => {
        throw new Error("boom")
      }
    } as unknown as Navigator)
    vi.stubGlobal("fetch", () => {
      throw new Error("boom")
    })

    expect(() =>
      logAffiliateClick({ product_id: "p", placement: "result" })
    ).not.toThrow()
  })
})
