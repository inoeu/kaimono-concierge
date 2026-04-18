import { describe, it, expect } from "vitest"
import { checkRateLimit } from "@/lib/rate-limit"

function requestFor(ip: string): Request {
  return new Request("http://example.com/", {
    headers: { "x-forwarded-for": ip }
  })
}

function anonRequest(ua = "test-ua"): Request {
  return new Request("http://example.com/", {
    headers: { "user-agent": ua }
  })
}

describe("checkRateLimit", () => {
  it("allows up to limit per window, then blocks", () => {
    const req = requestFor("1.2.3.4")
    const cfg = { limit: 3, windowMs: 60_000 }
    const results = [0, 1, 2, 3].map(() =>
      checkRateLimit(req, "test-allow", cfg)
    )
    expect(results[0].allowed).toBe(true)
    expect(results[1].allowed).toBe(true)
    expect(results[2].allowed).toBe(true)
    expect(results[3].allowed).toBe(false)
    expect(results[3].retryAfterSec).toBeGreaterThan(0)
  })

  it("tracks different IPs independently", () => {
    const a = requestFor("10.0.0.1")
    const b = requestFor("10.0.0.2")
    const cfg = { limit: 1, windowMs: 60_000 }
    expect(checkRateLimit(a, "test-iso", cfg).allowed).toBe(true)
    expect(checkRateLimit(a, "test-iso", cfg).allowed).toBe(false)
    expect(checkRateLimit(b, "test-iso", cfg).allowed).toBe(true)
  })

  it("scopes buckets per scope", () => {
    const req = requestFor("10.0.0.3")
    const cfg = { limit: 1, windowMs: 60_000 }
    expect(checkRateLimit(req, "scope-a", cfg).allowed).toBe(true)
    expect(checkRateLimit(req, "scope-a", cfg).allowed).toBe(false)
    // different scope, same IP, should be fresh
    expect(checkRateLimit(req, "scope-b", cfg).allowed).toBe(true)
  })

  it("falls back to UA hash when x-forwarded-for missing", () => {
    const a = anonRequest("chrome")
    const b = anonRequest("firefox")
    const cfg = { limit: 1, windowMs: 60_000 }
    expect(checkRateLimit(a, "test-anon", cfg).allowed).toBe(true)
    // same UA shares bucket
    expect(checkRateLimit(anonRequest("chrome"), "test-anon", cfg).allowed).toBe(
      false
    )
    // different UA is a separate bucket
    expect(checkRateLimit(b, "test-anon", cfg).allowed).toBe(true)
  })
})
