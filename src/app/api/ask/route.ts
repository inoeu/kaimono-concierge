import { NextResponse } from "next/server"
import { z } from "zod"
import { askNextQuestion, staticFallbackQuestion } from "@/lib/gemini"
import { checkRateLimit, rateLimitedJson } from "@/lib/rate-limit"

const Body = z.object({
  userInput: z.string().min(1).max(500),
  answers: z
    .array(
      z.object({
        question: z.string().min(1).max(300),
        answer: z.string().min(1).max(300)
      })
    )
    .max(4)
    .default([])
})

export async function POST(req: Request) {
  try {
    const rl = checkRateLimit(req, "ask", { limit: 20, windowMs: 60_000 })
    const blocked = rateLimitedJson(rl)
    if (blocked) return blocked
    const body = Body.parse(await req.json())

    try {
      const question = await askNextQuestion(body)
      return NextResponse.json({ question, fallback: false })
    } catch (e) {
      console.error("[api/ask] gemini failed, using static fallback", e)
      const question = staticFallbackQuestion(body.answers)
      return NextResponse.json({
        question,
        fallback: true,
        fallbackReason:
          "AIが一時的に応答できなかったため、定型の質問を表示しています。"
      })
    }
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "入力が正しくありません。" },
        { status: 400 }
      )
    }
    console.error("[api/ask]", e)
    return NextResponse.json(
      {
        error:
          "いま質問を生成できません。少し待ってからもう一度お試しください。"
      },
      { status: 500 }
    )
  }
}
