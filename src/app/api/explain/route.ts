import { NextResponse } from "next/server"
import { z } from "zod"
import { explainQuestion } from "@/lib/gemini"
import { checkRateLimit, rateLimitedJson } from "@/lib/rate-limit"

const Body = z.object({
  userInput: z.string().min(1).max(500),
  question: z.string().min(1).max(500),
  hint: z.string().max(500).optional(),
  options: z
    .array(
      z.object({
        label: z.string().max(200),
        description: z.string().max(500).optional()
      })
    )
    .max(12)
    .default([]),
  userQuestion: z.string().min(1).max(300),
  history: z
    .array(z.object({ q: z.string().max(300), a: z.string().max(1000) }))
    .max(8)
    .default([])
})

export async function POST(req: Request) {
  try {
    const rl = checkRateLimit(req, "explain", { limit: 30, windowMs: 60_000 })
    const blocked = rateLimitedJson(rl)
    if (blocked) return blocked
    const body = Body.parse(await req.json())
    const explanation = await explainQuestion(body)
    return NextResponse.json({ explanation })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "入力が正しくありません。" }, { status: 400 })
    }
    console.error("[api/explain]", e)
    return NextResponse.json(
      { error: "いま説明を生成できません。少し待ってから試してください。" },
      { status: 500 }
    )
  }
}
