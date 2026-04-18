// Click-log sink abstraction. Server-only — do not import from client code.
//
// The default sink writes one-line JSON to stdout, which is fine for Vercel's
// logs / Loki / Datadog and lets you get started without any external store.
// Swap to a persistent sink (Vercel KV / Upstash Redis / BigQuery / Postgres)
// by setting `CLICK_LOG_SINK` and wiring a new implementation here.

export type ClickEvent = {
  event: "affiliate_click"
  ts: string
  product_id: string
  keyword?: string
  placement: "home" | "result"
  notice?: "mock" | "fallback-search" | "fallback-rank" | "loose-search" | "empty"
  shop?: string
  price?: number
}

export interface ClickSink {
  write(e: ClickEvent): Promise<void>
}

// ---------- console sink ----------
const consoleSink: ClickSink = {
  async write(e) {
    // Single-line JSON so log aggregators can parse it as structured.
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(e))
  }
}

// ---------- Vercel KV sink (stub) ----------
// To enable, install `@vercel/kv`, set KV_REST_API_URL / KV_REST_API_TOKEN,
// and uncomment the body. Keeping this stub lets CI builds pass without the
// dependency, while documenting the intended swap point.
//
// import { kv } from "@vercel/kv"
// const vercelKvSink: ClickSink = {
//   async write(e) {
//     const bucket = e.ts.slice(0, 10) // YYYY-MM-DD
//     await kv.rpush(`click-log:${bucket}`, JSON.stringify(e))
//     await kv.expire(`click-log:${bucket}`, 60 * 60 * 24 * 90) // 90-day TTL
//   }
// }

let cached: ClickSink | null = null

export function getClickSink(): ClickSink {
  if (cached) return cached
  const mode = process.env.CLICK_LOG_SINK ?? "console"
  switch (mode) {
    // case "vercel-kv":
    //   cached = vercelKvSink
    //   break
    case "console":
    default:
      cached = consoleSink
      break
  }
  return cached
}
