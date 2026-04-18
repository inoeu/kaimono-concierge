// Rate limiter — adapter pattern.
//
// The default implementation is an in-memory sliding window, scoped to a
// single serverless instance. Good enough for small-to-medium public traffic
// on Vercel's Hobby tier.
//
// To go distributed:
//   1. `npm install @upstash/redis` (or pick your backend)
//   2. set `RATE_LIMIT_BACKEND=upstash-redis` plus `UPSTASH_REDIS_REST_URL`
//      / `UPSTASH_REDIS_REST_TOKEN` env vars
//   3. uncomment the `upstashRedisLimiter` block at the bottom of this file
//
// Public surface of this module is unchanged — `checkRateLimit()` and
// `rateLimitedJson()` — so routes don't need to touch the backend swap.

import { NextResponse } from "next/server"

export type WindowConfig = {
  limit: number
  windowMs: number
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSec: number
}

export interface RateLimiter {
  check(req: Request, scope: string, cfg: WindowConfig): RateLimitResult
}

// ---------- client IP extraction (shared across backends) ----------

function clientIp(req: Request): { key: string; anonymous: boolean } {
  const xff = req.headers.get("x-forwarded-for")
  if (xff) {
    const first = xff.split(",")[0]?.trim()
    if (first) return { key: first, anonymous: false }
  }
  const cf = req.headers.get("cf-connecting-ip")
  if (cf) return { key: cf, anonymous: false }
  const ua = req.headers.get("user-agent") ?? ""
  const hash = hashString(ua).toString(36)
  return { key: `anon:${hash}`, anonymous: true }
}

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return h >>> 0
}

let warnedOnceAnon = false
function warnAnonymousBucket() {
  if (warnedOnceAnon) return
  warnedOnceAnon = true
  console.warn(
    "[rate-limit] client IP not available (x-forwarded-for/cf-connecting-ip missing); falling back to User-Agent hash. Verify your deployment platform forwards client IP in production."
  )
}

// ---------- In-memory sliding window (default) ----------

type Bucket = { timestamps: number[] }
const buckets = new Map<string, Bucket>()
const MAX_KEYS = 20_000
const EVICT_BATCH = 1_000

const memoryLimiter: RateLimiter = {
  check(req, scope, cfg) {
    const ip = clientIp(req)
    if (ip.anonymous) warnAnonymousBucket()
    const key = `${scope}:${ip.key}`
    const now = Date.now()
    const existing = buckets.get(key)
    if (existing) buckets.delete(key)
    const bucket: Bucket = existing ?? { timestamps: [] }
    const fresh = bucket.timestamps.filter((t) => now - t < cfg.windowMs)
    if (fresh.length >= cfg.limit) {
      const oldest = fresh[0]
      const retryAfterMs = Math.max(0, cfg.windowMs - (now - oldest))
      bucket.timestamps = fresh
      buckets.set(key, bucket)
      return {
        allowed: false,
        remaining: 0,
        retryAfterSec: Math.ceil(retryAfterMs / 1000)
      }
    }
    fresh.push(now)
    bucket.timestamps = fresh
    buckets.set(key, bucket)

    if (buckets.size > MAX_KEYS) {
      let toRemove = Math.min(EVICT_BATCH, buckets.size - MAX_KEYS + EVICT_BATCH)
      for (const k of buckets.keys()) {
        if (toRemove <= 0) break
        if (k === key) continue
        buckets.delete(k)
        toRemove--
      }
    }

    return {
      allowed: true,
      remaining: Math.max(0, cfg.limit - fresh.length),
      retryAfterSec: 0
    }
  }
}

// ---------- Upstash Redis stub (distributed) ----------
// Uncomment after installing `@upstash/redis` and setting env vars.
//
// import { Redis } from "@upstash/redis"
//
// const upstashRedisLimiter: RateLimiter = (() => {
//   const redis = Redis.fromEnv()
//   return {
//     check(req, scope, cfg): RateLimitResult {
//       // Synchronous API required — use a cached promise and a non-blocking
//       // pattern, or switch to an async interface end-to-end (recommended
//       // for production). The simplest migration is to make check() async
//       // and await it at each call site.
//       throw new Error("upstash-redis limiter must be implemented async")
//     }
//   }
// })()

// ---------- factory ----------

function chooseLimiter(): RateLimiter {
  const backend = process.env.RATE_LIMIT_BACKEND ?? "memory"
  switch (backend) {
    // case "upstash-redis":
    //   return upstashRedisLimiter
    case "memory":
    default:
      return memoryLimiter
  }
}

let cached: RateLimiter | null = null
function limiter(): RateLimiter {
  if (cached) return cached
  cached = chooseLimiter()
  return cached
}

// ---------- public API ----------

export function checkRateLimit(
  req: Request,
  scope: string,
  cfg: WindowConfig
): RateLimitResult {
  return limiter().check(req, scope, cfg)
}

export function rateLimitedJson(result: RateLimitResult): NextResponse | null {
  if (result.allowed) return null
  return NextResponse.json(
    { error: "リクエストが集中しています。少し待ってからもう一度お試しください。" },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSec),
        "X-RateLimit-Remaining": "0"
      }
    }
  )
}
