import { describe, it, expect } from "vitest"
import { sanitizeAffiliateUrl } from "@/lib/url-safety"

describe("sanitizeAffiliateUrl", () => {
  it("accepts https rakuten.co.jp", () => {
    const url = "https://item.rakuten.co.jp/shop/abc"
    expect(sanitizeAffiliateUrl(url)).toBe(url)
  })

  it("accepts https subdomain of rakuten.co.jp", () => {
    const url = "https://hb.afl.rakuten.co.jp/x?y=1"
    expect(sanitizeAffiliateUrl(url)).toBe(url)
  })

  it("rejects javascript: URL", () => {
    expect(sanitizeAffiliateUrl("javascript:alert(1)")).toBeNull()
  })

  it("rejects http: URL", () => {
    expect(sanitizeAffiliateUrl("http://item.rakuten.co.jp/shop/abc")).toBeNull()
  })

  it("rejects non-rakuten host", () => {
    expect(
      sanitizeAffiliateUrl("https://evil.example.com/item")
    ).toBeNull()
  })

  it("rejects domain spoof (contains rakuten as substring)", () => {
    // rakuten.co.jp.evil.com must not pass
    expect(
      sanitizeAffiliateUrl("https://rakuten.co.jp.evil.com/item")
    ).toBeNull()
  })

  it("returns null for empty / undefined / null", () => {
    expect(sanitizeAffiliateUrl(null)).toBeNull()
    expect(sanitizeAffiliateUrl(undefined)).toBeNull()
    expect(sanitizeAffiliateUrl("")).toBeNull()
  })

  it("returns null for malformed URL", () => {
    expect(sanitizeAffiliateUrl("not a url")).toBeNull()
  })
})
