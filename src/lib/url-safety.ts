const ALLOWED_HOSTS = [
  "rakuten.co.jp",
  "hb.afl.rakuten.co.jp",
  "item.rakuten.co.jp",
  "af.rakuten.co.jp",
  "rakuten-affiliate.jp"
]

function hostIsAllowed(host: string): boolean {
  const lower = host.toLowerCase()
  return ALLOWED_HOSTS.some((h) => lower === h || lower.endsWith(`.${h}`))
}

export function sanitizeAffiliateUrl(raw: string | undefined | null): string | null {
  if (!raw) return null
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return null
  }
  if (parsed.protocol !== "https:") return null
  if (!hostIsAllowed(parsed.hostname)) return null
  return parsed.toString()
}
