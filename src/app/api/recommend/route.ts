import { NextResponse } from "next/server"
import { z } from "zod"
import {
  fallbackKeyword,
  fallbackRank,
  generateSearchQuery,
  rankProducts
} from "@/lib/gemini"
import { searchRakutenRelaxed } from "@/lib/rakuten"
import { getMockProducts } from "@/lib/mock-products"
import { checkRateLimit, rateLimitedJson } from "@/lib/rate-limit"
import type {
  Product,
  RankedProduct,
  RecommendNotice,
  RecommendResponse
} from "@/lib/types"

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

const MIN_SELECTED = 2
const TARGET_SELECTED = 4

function buildLooseMessage(dropped: ("price" | "ngKeyword" | "keywordTail")[]): string {
  const parts: string[] = []
  if (dropped.includes("price")) parts.push("価格帯")
  if (dropped.includes("ngKeyword")) parts.push("除外ワード")
  if (dropped.includes("keywordTail")) parts.push("キーワードの一部")
  if (parts.length === 0) {
    return "条件を広めに取り直して再検索しました。"
  }
  return `ぴったり合う商品が少なかったため、${parts.join("・")}を外して広めに検索しました。`
}

export async function POST(req: Request) {
  try {
    const rl = checkRateLimit(req, "recommend", { limit: 10, windowMs: 60_000 })
    const blocked = rateLimitedJson(rl)
    if (blocked) return blocked
    const body = Body.parse(await req.json())

    const notices: RecommendNotice[] = []

    let query
    try {
      const outcome = await generateSearchQuery(body)
      query = outcome.query
      if (outcome.fallback) {
        notices.push({
          kind: "fallback-search",
          message:
            "AIで検索語を絞り込めなかったため、あなたの入力からそのままキーワードを作りました。"
        })
      }
    } catch (e) {
      console.error("[api/recommend] generateSearchQuery unexpectedly threw", e)
      query = { keyword: fallbackKeyword(body.userInput) }
      notices.push({
        kind: "fallback-search",
        message:
          "AIで検索語を絞り込めなかったため、あなたの入力からそのままキーワードを作りました。"
      })
    }

    let candidates: Product[] = []
    let usedMock = false
    try {
      const outcome = await searchRakutenRelaxed({
        keyword: query.keyword,
        ngKeyword: query.ngKeyword,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
        hits: 30,
        sort: "standard"
      })
      candidates = outcome.items
      if (outcome.relaxedLevel > 0 && outcome.items.length > 0) {
        notices.push({
          kind: "loose-search",
          message: buildLooseMessage(outcome.droppedFilters)
        })
      }
    } catch (e) {
      console.error("[api/recommend] Rakuten API failed", e)
      candidates = getMockProducts(query.keyword)
      usedMock = true
      notices.push({
        kind: "mock",
        message:
          "楽天検索に一時的に接続できないため、参考のデモ商品を表示しています。商品ページのリンクは利用できません。"
      })
    }

    if (candidates.length === 0) {
      candidates = getMockProducts(query.keyword)
      if (candidates.length > 0) {
        usedMock = true
        notices.push({
          kind: "mock",
          message:
            "検索条件に合う商品が見つからなかったため、近いカテゴリのデモ商品を表示しています。"
        })
      }
    }

    if (candidates.length === 0) {
      notices.push({
        kind: "empty",
        message:
          "検索結果は0件でした。価格帯や用途の条件を緩めると候補が増えやすくなります。"
      })
      const emptyResponse: RecommendResponse = {
        summary_condition: `${query.keyword} に合う商品が見つかりませんでした。条件を少し緩めてもう一度お試しください。`,
        selected: [],
        notice: notices[0],
        notices,
        keyword: query.keyword
      }
      return NextResponse.json(emptyResponse)
    }

    const priceRange = {
      minPrice: query.minPrice,
      maxPrice: query.maxPrice
    }

    let ranked
    let rankFellBack = false
    try {
      ranked = await rankProducts(
        {
          userInput: body.userInput,
          answers: body.answers,
          candidates
        },
        priceRange
      )
    } catch (e) {
      console.error("[api/recommend] rankProducts failed", e)
      ranked = fallbackRank(
        {
          userInput: body.userInput,
          answers: body.answers,
          candidates
        },
        priceRange
      )
      rankFellBack = true
    }

    const byId = new Map(candidates.map((c) => [c.id, c]))

    type MaterializedItem = RankedProduct & { product: Product }
    type MaterializeResult = {
      items: MaterializedItem[]
      droppedMissing: number
      droppedDuplicate: number
    }

    function materialize(selectedRaw: RankedProduct[]): MaterializeResult {
      const seen = new Set<string>()
      const items: MaterializedItem[] = []
      let droppedMissing = 0
      let droppedDuplicate = 0
      for (const r of selectedRaw) {
        if (seen.has(r.product_id)) {
          droppedDuplicate++
          continue
        }
        const product = byId.get(r.product_id)
        if (!product) {
          droppedMissing++
          continue
        }
        seen.add(r.product_id)
        items.push({ ...r, product })
      }
      return { items, droppedMissing, droppedDuplicate }
    }

    const mat = materialize(ranked.selected)
    let selected = mat.items.slice(0, TARGET_SELECTED)
    let summaryCondition = ranked.summary_condition
    let usedTopUp = false

    if (selected.length < MIN_SELECTED) {
      const fb = fallbackRank(
        {
          userInput: body.userInput,
          answers: body.answers,
          candidates
        },
        priceRange
      )
      const seenIds = new Set(selected.map((s) => s.product_id))
      for (const r of fb.selected) {
        if (selected.length >= TARGET_SELECTED) break
        if (seenIds.has(r.product_id)) continue
        const product = byId.get(r.product_id)
        if (!product) continue
        selected.push({ ...r, product })
        seenIds.add(r.product_id)
        usedTopUp = true
      }
      if (
        selected.length > 0 &&
        selected[0].product_id !== ranked.selected[0]?.product_id
      ) {
        summaryCondition = fb.summary_condition
      }
    }

    // We only flag "fallback-rank" when we had to fill in or substitute —
    // not when the LLM just happened to return more than TARGET_SELECTED
    // valid items (that is natural overflow, not a degradation).
    const needsFallbackNotice =
      rankFellBack ||
      usedTopUp ||
      mat.droppedMissing > 0 ||
      mat.droppedDuplicate > 0

    if (
      needsFallbackNotice &&
      !usedMock &&
      !notices.some((n) => n.kind === "fallback-rank")
    ) {
      notices.push({
        kind: "fallback-rank",
        message:
          "AIによる個別のおすすめ理由付けが一部利用できなかったため、評価順で補完しています。"
      })
    }

    const response: RecommendResponse = {
      summary_condition: summaryCondition,
      selected,
      notice: notices[0] ?? null,
      notices,
      keyword: query.keyword
    }
    return NextResponse.json(response)
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "入力が正しくありません。" }, { status: 400 })
    }
    console.error("[api/recommend]", e)
    return NextResponse.json(
      { error: "いま提案を生成できません。少し待ってからもう一度お試しください。" },
      { status: 500 }
    )
  }
}
