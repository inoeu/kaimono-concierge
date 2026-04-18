import type { Product } from "./types"
import { sanitizeAffiliateUrl } from "./url-safety"

const ENDPOINT =
  "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401"

// Referer must match one of the "Allowed websites" in Rakuten Developer dashboard.
// "rakuten.co.jp" is a default allowed entry. When deploying to production,
// add your domain to the Allowed websites and update RAKUTEN_REFERER.
const DEFAULT_REFERER = process.env.RAKUTEN_REFERER ?? "https://rakuten.co.jp/"

if (
  process.env.NODE_ENV === "production" &&
  !process.env.RAKUTEN_REFERER
) {
  console.warn(
    "[rakuten] RAKUTEN_REFERER is not set; falling back to https://rakuten.co.jp/. Register your production domain in the Rakuten developer dashboard and set RAKUTEN_REFERER."
  )
}

const RAKUTEN_TIMEOUT_MS = 5_000

export type RakutenSearchOptions = {
  keyword: string
  ngKeyword?: string
  minPrice?: number
  maxPrice?: number
  hits?: number
  sort?: "standard" | "+itemPrice" | "-itemPrice" | "-reviewAverage" | "-reviewCount"
  genreId?: string
}

type RakutenItemRaw = {
  itemName: string
  itemPrice: number
  itemCode: string
  itemUrl: string
  affiliateUrl?: string
  mediumImageUrls: ({ imageUrl: string } | string)[]
  reviewAverage: number
  reviewCount: number
  shopName: string
  itemCaption: string
}

type RakutenResponse = {
  Items?: ({ Item: RakutenItemRaw } | RakutenItemRaw)[]
  errors?: { errorCode: number; errorMessage: string }
  error?: string
  error_description?: string
}

export async function searchRakuten(
  opts: RakutenSearchOptions
): Promise<Product[]> {
  const appId = process.env.RAKUTEN_APP_ID
  const accessKey = process.env.RAKUTEN_ACCESS_KEY
  const affId = process.env.RAKUTEN_AFFILIATE_ID

  if (!appId) throw new Error("RAKUTEN_APP_ID is not set")
  if (!accessKey) throw new Error("RAKUTEN_ACCESS_KEY is not set")

  const url = new URL(ENDPOINT)
  url.searchParams.set("applicationId", appId)
  url.searchParams.set("accessKey", accessKey)
  if (affId) url.searchParams.set("affiliateId", affId)
  url.searchParams.set("format", "json")
  url.searchParams.set("keyword", opts.keyword)
  url.searchParams.set("hits", String(opts.hits ?? 30))
  if (opts.minPrice) url.searchParams.set("minPrice", String(opts.minPrice))
  if (opts.maxPrice) url.searchParams.set("maxPrice", String(opts.maxPrice))
  if (opts.ngKeyword) url.searchParams.set("NGKeyword", opts.ngKeyword)
  if (opts.sort) url.searchParams.set("sort", opts.sort)
  if (opts.genreId) url.searchParams.set("genreId", opts.genreId)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), RAKUTEN_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(url.toString(), {
      headers: {
        Referer: DEFAULT_REFERER,
        Origin: new URL(DEFAULT_REFERER).origin
      },
      next: { revalidate: 3600 },
      signal: controller.signal
    })
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("Rakuten API timeout")
    }
    throw e
  } finally {
    clearTimeout(timer)
  }

  const ct = res.headers.get("content-type") ?? ""
  if (!ct.includes("application/json")) {
    throw new Error(`Rakuten API returned non-JSON: HTTP ${res.status}`)
  }
  const data: RakutenResponse = await res.json()

  if (data.errors) {
    throw new Error(
      `Rakuten API error ${data.errors.errorCode}: ${data.errors.errorMessage}`
    )
  }
  if (data.error) {
    throw new Error(`Rakuten API: ${data.error} - ${data.error_description}`)
  }
  if (!res.ok) {
    throw new Error(`Rakuten API HTTP ${res.status} ${res.statusText}`)
  }

  const items = data.Items ?? []
  return items
    .map((entry) => ("Item" in entry ? entry.Item : entry))
    .map(normalize)
    .filter((p): p is Product => p !== null)
}

/**
 * Progressive relaxation search: try the user's intended query first, then
 * drop filters one at a time until we get non-zero results or run out of
 * options. Returns the level that succeeded so the caller can inform the
 * user that a broader search was used.
 *
 * Levels:
 *   0 = as requested (full keyword + ngKeyword + price range)
 *   1 = drop price range
 *   2 = drop ngKeyword as well
 *   3 = shorten keyword to the first 2 meaningful tokens
 */
export type RelaxedSearchOutcome = {
  items: Product[]
  relaxedLevel: 0 | 1 | 2 | 3
  droppedFilters: ("price" | "ngKeyword" | "keywordTail")[]
}

function firstTwoTokens(keyword: string): string {
  const parts = keyword
    .split(/[\s\u3000]+/)
    .map((t) => t.trim())
    .filter(Boolean)
  return parts.slice(0, 2).join(" ") || keyword
}

export async function searchRakutenRelaxed(
  opts: RakutenSearchOptions
): Promise<RelaxedSearchOutcome> {
  const dropped: RelaxedSearchOutcome["droppedFilters"] = []

  // level 0 — as requested
  let items = await searchRakuten(opts)
  if (items.length > 0) return { items, relaxedLevel: 0, droppedFilters: [] }

  // level 1 — drop price range
  if (opts.minPrice != null || opts.maxPrice != null) {
    items = await searchRakuten({ ...opts, minPrice: undefined, maxPrice: undefined })
    dropped.push("price")
    if (items.length > 0) return { items, relaxedLevel: 1, droppedFilters: [...dropped] }
  }

  // level 2 — drop ngKeyword as well
  if (opts.ngKeyword) {
    items = await searchRakuten({
      ...opts,
      minPrice: undefined,
      maxPrice: undefined,
      ngKeyword: undefined
    })
    dropped.push("ngKeyword")
    if (items.length > 0) return { items, relaxedLevel: 2, droppedFilters: [...dropped] }
  }

  // level 3 — shorten keyword
  const short = firstTwoTokens(opts.keyword)
  if (short !== opts.keyword) {
    items = await searchRakuten({
      ...opts,
      minPrice: undefined,
      maxPrice: undefined,
      ngKeyword: undefined,
      keyword: short
    })
    dropped.push("keywordTail")
  }

  return { items, relaxedLevel: 3, droppedFilters: dropped }
}

function normalize(it: RakutenItemRaw): Product | null {
  const rawAffiliate = it.affiliateUrl || it.itemUrl
  const safeAffiliate = sanitizeAffiliateUrl(rawAffiliate)
  if (!safeAffiliate) return null

  const firstImg = it.mediumImageUrls?.[0]
  const imgUrl =
    typeof firstImg === "string" ? firstImg : firstImg?.imageUrl ?? ""
  const img = imgUrl ? imgUrl.replace("_ex=128x128", "_ex=300x300") : ""

  return {
    id: it.itemCode,
    source: "rakuten",
    title: it.itemName,
    price: it.itemPrice,
    imageUrl: img,
    rating: it.reviewAverage ?? 0,
    reviewCount: it.reviewCount ?? 0,
    shopName: it.shopName,
    affiliateUrl: safeAffiliate,
    caption: (it.itemCaption ?? "").slice(0, 400)
  }
}
