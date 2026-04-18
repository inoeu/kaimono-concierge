import { NextResponse } from "next/server"
import { z } from "zod"
import { generateSelectionGuide } from "@/lib/gemini"
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
    .default([])
})

export async function POST(req: Request) {
  try {
    const rl = checkRateLimit(req, "guide", { limit: 30, windowMs: 60_000 })
    const blocked = rateLimitedJson(rl)
    if (blocked) return blocked
    const body = Body.parse(await req.json())
    const guide = await generateSelectionGuide(body)
    return NextResponse.json({ guide })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "入力が正しくありません。" }, { status: 400 })
    }
    console.error("[api/guide]", e)
    return NextResponse.json(
      { error: "いまガイドを生成できません。少し待ってから試してください。" },
      { status: 500 }
    )
  }
}
