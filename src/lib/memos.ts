"use client"

import type {
  HearingAnswer,
  HearingOption,
  HearingQuestion,
  Product,
  RankedProduct,
  RecommendNotice,
  RecommendResponse,
  SizeMode
} from "./types"
import { sanitizeAffiliateUrl } from "./url-safety"

export type MemoPhase = "idle" | "asking" | "result"

export type Memo = {
  id: string
  text: string
  createdAt: number
  phase: MemoPhase
  answers: HearingAnswer[]
  question: HearingQuestion | null
  loading: boolean
  result: RecommendResponse | null
  resultLoading: boolean
  error: string | null
}

const KEY = "kaimono:memos:v2"

// ----- lightweight type guards (no extra bundle cost) -----

const str = (v: unknown): v is string => typeof v === "string"
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v)
const bool = (v: unknown): v is boolean => typeof v === "boolean"
const arr = <T>(v: unknown, guard: (x: unknown) => x is T): T[] =>
  Array.isArray(v) ? v.filter(guard) : []

function isOption(v: unknown): v is HearingOption {
  if (!v || typeof v !== "object") return false
  const o = v as Record<string, unknown>
  if (!str(o.label) || !str(o.value)) return false
  if (o.description !== undefined && !str(o.description)) return false
  return true
}

function isSizeMode(v: unknown): v is SizeMode {
  return v === "people" || v === "liter"
}

function sanitizeQuestion(v: unknown): HearingQuestion | null {
  if (!v || typeof v !== "object") return null
  const q = v as Record<string, unknown>
  if (!str(q.id) || !str(q.question)) return null
  const options = arr(q.options, isOption)
  if (!options.length) return null
  let viewModes: HearingQuestion["viewModes"]
  if (Array.isArray(q.viewModes)) {
    viewModes = q.viewModes
      .map((vm) => {
        if (!vm || typeof vm !== "object") return null
        const vv = vm as Record<string, unknown>
        if (!isSizeMode(vv.mode) || !str(vv.label)) return null
        const opts = arr(vv.options, isOption)
        if (!opts.length) return null
        return { mode: vv.mode, label: vv.label, options: opts }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
    if (viewModes.length === 0) viewModes = undefined
  }
  return {
    id: q.id,
    question: q.question,
    hint: str(q.hint) ? q.hint : undefined,
    options,
    allowCustom: bool(q.allowCustom) ? q.allowCustom : true,
    allowSkip: bool(q.allowSkip) ? q.allowSkip : true,
    viewModes
  }
}

function isAnswer(v: unknown): v is HearingAnswer {
  if (!v || typeof v !== "object") return false
  const a = v as Record<string, unknown>
  return str(a.question) && str(a.answer)
}

function sanitizeProduct(v: unknown): Product | null {
  if (!v || typeof v !== "object") return null
  const p = v as Record<string, unknown>
  if (!str(p.id) || !str(p.title) || !str(p.affiliateUrl)) return null
  if (!num(p.price)) return null
  // Re-verify the affiliate URL even when loading from localStorage — the
  // storage itself is not a trust boundary, so a tampered value must not
  // slip through to href=. A failed check drops the product entirely.
  const safeUrl = sanitizeAffiliateUrl(p.affiliateUrl)
  if (!safeUrl) return null
  // HTTPS-only to avoid mixed-content breakage on production hosts.
  const safeImg = str(p.imageUrl) ? p.imageUrl.trim() : ""
  const validImg = safeImg.startsWith("https://") ? safeImg : ""
  return {
    id: p.id,
    source: "rakuten",
    title: p.title,
    price: p.price,
    imageUrl: validImg,
    rating: num(p.rating) ? p.rating : 0,
    reviewCount: num(p.reviewCount) ? p.reviewCount : 0,
    shopName: str(p.shopName) ? p.shopName : "",
    affiliateUrl: safeUrl,
    caption: str(p.caption) ? p.caption : ""
  }
}

function sanitizeRanked(
  v: unknown
): (RankedProduct & { product: Product }) | null {
  if (!v || typeof v !== "object") return null
  const r = v as Record<string, unknown>
  if (!str(r.product_id) || !str(r.one_liner) || !str(r.reason)) return null
  const product = sanitizeProduct(r.product)
  if (!product) return null
  return {
    product_id: r.product_id,
    one_liner: r.one_liner,
    fits: arr(r.fits, str),
    unfits: arr(r.unfits, str),
    reason: r.reason,
    product
  }
}

function isNoticeKind(v: unknown): v is RecommendNotice["kind"] {
  return (
    v === "mock" ||
    v === "fallback-search" ||
    v === "fallback-rank" ||
    v === "loose-search" ||
    v === "empty"
  )
}

function sanitizeNotice(v: unknown): RecommendNotice | null {
  if (!v || typeof v !== "object") return null
  const n = v as Record<string, unknown>
  if (!isNoticeKind(n.kind)) return null
  if (!str(n.message)) return null
  return { kind: n.kind, message: n.message }
}

function sanitizeResult(v: unknown): RecommendResponse | null {
  if (!v || typeof v !== "object") return null
  const r = v as Record<string, unknown>
  if (!str(r.summary_condition)) return null
  const rawSelected = Array.isArray(r.selected) ? r.selected : []
  const selected = rawSelected
    .map(sanitizeRanked)
    .filter((x): x is NonNullable<typeof x> => x !== null)

  // Merge legacy single `notice` with `notices[]`, dedupe by kind. This
  // prevents the UI from hiding an older single-field warning just because
  // the newer structure uses an array.
  const merged: RecommendNotice[] = []
  const legacy = sanitizeNotice(r.notice)
  if (legacy) merged.push(legacy)
  const rawArr = Array.isArray(r.notices) ? r.notices : []
  for (const raw of rawArr) {
    const n = sanitizeNotice(raw)
    if (!n) continue
    if (merged.some((m) => m.kind === n.kind)) continue
    merged.push(n)
  }

  // If the stored result had items we had to drop (e.g. broken affiliate URL
  // from tampered storage, outdated schema), inform the user so the empty
  // space on the card list is not mysterious.
  const dropped = rawSelected.length - selected.length
  if (dropped > 0 && !merged.some((n) => n.kind === "fallback-rank")) {
    merged.push({
      kind: "fallback-rank",
      message:
        "保存されていた一部のおすすめ結果に不整合があったため、取り除きました。もう一度相談すると最新の提案を取得できます。"
    })
  }

  return {
    summary_condition: r.summary_condition,
    selected,
    notice: merged[0] ?? null,
    notices: merged,
    keyword: str(r.keyword) ? r.keyword : undefined
  }
}

function sanitizeMemo(v: unknown): Memo | null {
  if (!v || typeof v !== "object") return null
  const m = v as Record<string, unknown>
  if (!str(m.id) || !str(m.text) || !num(m.createdAt)) return null
  const phase: MemoPhase =
    m.phase === "idle" || m.phase === "asking" || m.phase === "result"
      ? m.phase
      : "idle"
  return {
    id: m.id,
    text: m.text,
    createdAt: m.createdAt,
    phase,
    answers: arr(m.answers, isAnswer),
    question: sanitizeQuestion(m.question),
    loading: false,
    result: sanitizeResult(m.result),
    resultLoading: false,
    error: str(m.error) ? m.error : null
  }
}

// ----- storage -----

export function loadMemos(): Memo[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(sanitizeMemo)
      .filter((m): m is Memo => m !== null)
  } catch {
    return []
  }
}

export function saveMemos(memos: Memo[]) {
  if (typeof window === "undefined") return
  try {
    const snapshot = memos.map((m) => ({
      ...m,
      loading: false,
      resultLoading: false
    }))
    localStorage.setItem(KEY, JSON.stringify(snapshot))
  } catch {
    // ignore quota / privacy-mode errors
  }
}

export function newMemo(text: string): Memo {
  return {
    id: newId(),
    text,
    createdAt: Date.now(),
    phase: "idle",
    answers: [],
    question: null,
    loading: false,
    result: null,
    resultLoading: false,
    error: null
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  const day = 1000 * 60 * 60 * 24
  if (diff < day) return "今日"
  const days = Math.floor(diff / day)
  if (days === 1) return "昨日"
  if (days < 7) return `${days}日前`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}週間前`
  const months = Math.floor(days / 30)
  return `${months}ヶ月前`
}
