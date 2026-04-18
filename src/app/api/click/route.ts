import { NextResponse } from "next/server"
import { z } from "zod"
import { checkRateLimit } from "@/lib/rate-limit"
import { getClickSink } from "@/lib/click-sink"

const Body = z.object({
  product_id: z.string().min(1).max(200),
  keyword: z.string().min(1).max(120).optional(),
  placement: z.enum(["home", "result"]).default("home"),
  notice: z
    .enum(["mock", "fallback-search", "fallback-rank", "loose-search", "empty"])
    .optional(),
  shop: z.string().max(120).optional(),
  price: z.number().int().nonnegative().optional()
})

export async function POST(req: Request) {
  try {
    const rl = checkRateLimit(req, "click", { limit: 120, windowMs: 60_000 })
    if (!rl.allowed) {
      return NextResponse.json(
        { ok: false, error: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      )
    }
    const raw = await req.json().catch(() => ({}))
    const body = Body.parse(raw)
    await getClickSink().write({
      event: "affiliate_click",
      ts: new Date().toISOString(),
      ...body
    })
    return NextResponse.json({ ok: true }, { status: 202 })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 })
    }
    console.error("[api/click]", e)
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
