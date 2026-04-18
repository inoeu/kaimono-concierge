"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useMemo, useRef, useState } from "react"
import type {
  HearingAnswer,
  HearingOption,
  HearingQuestion,
  RecommendNotice,
  RecommendResponse,
  SizeMode
} from "@/lib/types"
import { formatRelative, loadMemos, Memo, newMemo, saveMemos } from "@/lib/memos"
import { addHistory } from "@/lib/history"
import { logAffiliateClick } from "@/lib/click-log"
import { normalizeUserText } from "@/lib/text"

async function safeFetchJson<T = unknown>(
  url: string,
  body: unknown
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })
  const ct = res.headers.get("content-type") ?? ""
  if (!ct.includes("application/json")) {
    throw new Error(`サーバーから想定外の応答 (HTTP ${res.status})`)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`)
  }
  return data as T
}

function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message
  return fallback
}

function isMockNotice(result: RecommendResponse | null | undefined): boolean {
  if (!result) return false
  const list = result.notices ?? (result.notice ? [result.notice] : [])
  return list.some((n) => n.kind === "mock")
}

function firstNoticeKind(
  result: RecommendResponse | null | undefined
): RecommendNotice["kind"] | undefined {
  if (!result) return undefined
  const list = result.notices ?? (result.notice ? [result.notice] : [])
  return list[0]?.kind
}

type View =
  | { name: "home" }
  | { name: "question"; memoId: string }
  | { name: "result"; memoId: string }

export default function Home() {
  const [memos, setMemos] = useState<Memo[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [stack, setStack] = useState<View[]>([{ name: "home" }])
  const [transition, setTransition] = useState<{
    prev: View
    direction: "forward" | "back"
  } | null>(null)

  useEffect(() => {
    setMemos(loadMemos())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const start = params.get("start")
    if (!start) return
    const normalized = normalizeUserText(start, 200)
    window.history.replaceState(null, "", window.location.pathname)
    if (!normalized) return
    createMemo(normalized)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated])

  useEffect(() => {
    if (hydrated) saveMemos(memos)
  }, [memos, hydrated])

  const current = stack[stack.length - 1]

  function pushView(next: View) {
    setTransition({ prev: current, direction: "forward" })
    setStack((s) => [...s, next])
    window.setTimeout(() => setTransition(null), 340)
  }

  function popView() {
    if (stack.length <= 1) return
    const prev = stack[stack.length - 1]
    setTransition({ prev, direction: "back" })
    setStack((s) => s.slice(0, -1))
    window.setTimeout(() => setTransition(null), 340)
  }

  function patch(id: string, p: Partial<Memo>) {
    setMemos((prev) => prev.map((m) => (m.id === id ? { ...m, ...p } : m)))
  }

  function createMemo(text: string) {
    const m = newMemo(text)
    setMemos((prev) => [m, ...prev])
    addHistory(text)
    pushView({ name: "question", memoId: m.id })
    askNext(m.id, text, [])
  }

  async function askNext(memoId: string, text: string, answers: HearingAnswer[]) {
    patch(memoId, { phase: "asking", loading: true, question: null, error: null })
    try {
      const data = await safeFetchJson<{
        question: HearingQuestion | null
      }>("/api/ask", { userInput: text, answers })
      if (!data.question) {
        // AI judged hearing is complete — move on to results
        pushView({ name: "result", memoId })
        await fetchResults(memoId, text, answers)
        return
      }
      patch(memoId, { question: data.question, loading: false })
    } catch (e) {
      patch(memoId, {
        error: errorMessage(e, "質問を生成できませんでした。"),
        loading: false
      })
    }
  }

  async function fetchResults(
    memoId: string,
    text: string,
    answers: HearingAnswer[]
  ) {
    patch(memoId, {
      phase: "result",
      resultLoading: true,
      error: null,
      question: null,
      loading: false
    })
    try {
      const data = await safeFetchJson<RecommendResponse>("/api/recommend", {
        userInput: text,
        answers
      })
      patch(memoId, { result: data, resultLoading: false })
    } catch (e) {
      patch(memoId, {
        error: errorMessage(e, "提案を生成できませんでした。"),
        resultLoading: false
      })
    }
  }

  async function retryResults(memoId: string) {
    const m = memos.find((x) => x.id === memoId)
    if (!m) return
    await fetchResults(memoId, m.text, m.answers)
  }

  async function submitAnswer(memoId: string, value: string, label?: string) {
    const m = memos.find((x) => x.id === memoId)
    if (!m || !m.question) return
    const answer: HearingAnswer = {
      question: m.question.question,
      answer: label ?? value
    }
    const nextAnswers = [...m.answers, answer]
    patch(memoId, { answers: nextAnswers, question: null, loading: true })
    if (nextAnswers.length >= 4) {
      pushView({ name: "result", memoId })
      await fetchResults(memoId, m.text, nextAnswers)
    } else {
      await askNext(memoId, m.text, nextAnswers)
    }
  }

  async function skipQuestion(memoId: string) {
    await submitAnswer(memoId, "(特になし)", "(特になし)")
  }

  async function stopAndSeeResults(memoId: string) {
    const m = memos.find((x) => x.id === memoId)
    if (!m) return
    pushView({ name: "result", memoId })
    await fetchResults(memoId, m.text, m.answers)
  }

  async function askMore(memoId: string) {
    const m = memos.find((x) => x.id === memoId)
    if (!m) return
    pushView({ name: "question", memoId })
    await askNext(memoId, m.text, m.answers)
  }

  async function retryAsk(memoId: string) {
    const m = memos.find((x) => x.id === memoId)
    if (!m) return
    await askNext(memoId, m.text, m.answers)
  }

  function openMemo(memoId: string) {
    const m = memos.find((x) => x.id === memoId)
    if (!m) return
    if (m.phase === "result" && m.result) {
      pushView({ name: "result", memoId })
    } else {
      pushView({ name: "question", memoId })
      if (!m.question && !m.loading) {
        askNext(memoId, m.text, m.answers)
      }
    }
  }

  function deleteMemo(memoId: string) {
    setMemos((prev) => prev.filter((m) => m.id !== memoId))
    popView()
  }

  function deleteMemoFromHome(memoId: string) {
    setMemos((prev) => prev.filter((m) => m.id !== memoId))
  }

  function renderView(v: View) {
    if (v.name === "home") {
      return (
        <HomeView
          memos={memos}
          onCreate={createMemo}
          onOpenMemo={openMemo}
          onDeleteMemo={deleteMemoFromHome}
        />
      )
    }
    const memo = memos.find((m) => m.id === v.memoId)
    if (!memo) return <HomeView memos={memos} onCreate={createMemo} onOpenMemo={openMemo} onDeleteMemo={deleteMemoFromHome} />
    if (v.name === "question") {
      return (
        <QuestionView
          memo={memo}
          onBack={popView}
          onAnswer={(val, label) => submitAnswer(memo.id, val, label)}
          onSkip={() => skipQuestion(memo.id)}
          onSeeResults={() => stopAndSeeResults(memo.id)}
          onRetry={() => retryAsk(memo.id)}
          onDelete={() => deleteMemo(memo.id)}
        />
      )
    }
    if (v.name === "result") {
      return (
        <ResultView
          memo={memo}
          onBack={popView}
          onAskMore={() => askMore(memo.id)}
          onRetry={() => retryResults(memo.id)}
          onDelete={() => deleteMemo(memo.id)}
        />
      )
    }
    return null
  }

  return (
    <div className="app-shell">
      <div className="view-stack">
        {transition && (
          <div
            key={`exit-${viewKey(transition.prev)}-${stack.length}`}
            className={`view-layer ${
              transition.direction === "forward" ? "anim-exit-forward" : "anim-exit-back"
            }`}
            style={{ pointerEvents: "none" }}
          >
            {renderView(transition.prev)}
          </div>
        )}
        <div
          key={`cur-${viewKey(current)}-${stack.length}`}
          className={`view-layer ${
            transition
              ? transition.direction === "forward"
                ? "anim-enter-forward"
                : "anim-enter-back"
              : ""
          }`}
        >
          {renderView(current)}
        </div>
      </div>
    </div>
  )
}

function viewKey(v: View) {
  return v.name === "home" ? "home" : `${v.name}-${v.memoId}`
}

/* ============================== Home ============================== */
function HomeView({
  memos,
  onCreate,
  onOpenMemo,
  onDeleteMemo
}: {
  memos: Memo[]
  onCreate: (text: string) => void
  onOpenMemo: (memoId: string) => void
  onDeleteMemo: (memoId: string) => void
}) {
  const [draft, setDraft] = useState("")
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const today = new Date()
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][today.getDay()]
  const dateLabel = `${today.getMonth() + 1}月${today.getDate()}日 ${weekday}曜日`

  function commit() {
    const t = draft.trim()
    if (!t) return
    onCreate(t)
    setDraft("")
  }

  // auto-resize the draft textarea to match content height
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = "0"
    el.style.height = `${Math.max(28, el.scrollHeight)}px`
  }, [draft])

  function focusDraft() {
    inputRef.current?.focus()
    const el = inputRef.current
    if (el) {
      const len = el.value.length
      el.setSelectionRange(len, len)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center justify-between px-5 pt-5 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-ink-800 text-white flex items-center justify-center text-xs font-bold tracking-tight">
            K
          </span>
          <span className="text-[13px] font-medium text-ink-700">Kaimono</span>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/category"
            className="btn-ghost"
            aria-label="カテゴリから探す"
          >
            カテゴリ
          </Link>
        </div>
      </header>

      <div
        className="flex-1 px-8 pt-6 pb-10 cursor-text"
        onClick={(e) => {
          // only focus input when clicking blank area (not on a memo link)
          if ((e.target as HTMLElement).closest("button, a")) return
          focusDraft()
        }}
      >
        <div className="text-[11px] uppercase tracking-[0.15em] text-ink-400 mb-6">
          {dateLabel}
        </div>

        <div className="space-y-0.5">
          {memos.map((m) => (
            <DocumentLine
              key={m.id}
              memo={m}
              onClick={() => onOpenMemo(m.id)}
              onDelete={() => onDeleteMemo(m.id)}
            />
          ))}

          <DraftLine
            value={draft}
            onChange={setDraft}
            onCommit={commit}
            textareaRef={inputRef}
            isFirst={memos.length === 0}
          />
        </div>
      </div>
    </div>
  )
}

function DocumentLine({
  memo,
  onClick,
  onDelete
}: {
  memo: Memo
  onClick: () => void
  onDelete: () => void
}) {
  return (
    <div className="group flex items-center gap-1 py-1.5 px-1 -mx-1 rounded-md hover:bg-paper-100 transition-colors">
      <button
        onClick={onClick}
        className="flex-1 min-w-0 flex items-center gap-3 text-left"
      >
        <MemoDot memo={memo} />
        <span className="flex-1 min-w-0 text-[16px] leading-[1.8] text-ink-900 truncate underline decoration-paper-300 decoration-1 underline-offset-[5px] group-hover:decoration-ink-400">
          {memo.text}
        </span>
        <span className="text-[11px] text-ink-400 flex-shrink-0">
          <MemoStatus memo={memo} />
        </span>
        <span className="text-ink-300 group-hover:text-ink-600 text-sm flex-shrink-0 transition-colors">
          →
        </span>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          if (confirm("このメモを削除しますか?")) onDelete()
        }}
        className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-ink-400 opacity-60 group-hover:opacity-100 focus-visible:opacity-100 hover:text-red-500 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 transition-all"
        aria-label={`「${memo.text}」を削除`}
      >
        ✕
      </button>
    </div>
  )
}

function DraftLine({
  value,
  onChange,
  onCommit,
  textareaRef,
  isFirst
}: {
  value: string
  onChange: (v: string) => void
  onCommit: () => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  isFirst: boolean
}) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="w-2 h-2 rounded-full bg-paper-300 flex-shrink-0 mt-[11px]" />
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            onCommit()
          }
        }}
        rows={1}
        autoFocus
        aria-label="欲しいものを書く"
        placeholder={isFirst ? "ここに欲しいものを書く…" : "次のメモ…"}
        className="flex-1 bg-transparent outline-none resize-none placeholder:text-ink-400 text-ink-900 text-[16px] leading-[1.8] caret-accent-500 py-0"
        style={{ height: "28px" }}
      />
    </div>
  )
}

function MemoDot({ memo }: { memo: Memo }) {
  const base = "w-2 h-2 rounded-full flex-shrink-0 mt-2"
  if (memo.phase === "result" && memo.result) return <span className={`${base} bg-check-500`} />
  if (memo.phase === "asking") return <span className={`${base} bg-accent-500`} />
  return <span className={`${base} bg-paper-300`} />
}

function MemoStatus({ memo }: { memo: Memo }) {
  if (memo.phase === "result" && memo.result) return <>結果 {memo.result.selected.length}件</>
  if (memo.phase === "asking") {
    const n = memo.answers.length
    if (n === 0) return <>相談中</>
    return <>相談中・{n}問に回答済み</>
  }
  return <>未相談</>
}

/* ============================== Question ============================== */
type ClarifyTurn = { q: string; a: string }

function QuestionView({
  memo,
  onBack,
  onAnswer,
  onSkip,
  onSeeResults,
  onRetry,
  onDelete
}: {
  memo: Memo
  onBack: () => void
  onAnswer: (value: string, label?: string) => void
  onSkip: () => void
  onSeeResults: () => void
  onRetry: () => void
  onDelete: () => void
}) {
  const [showCustom, setShowCustom] = useState(false)
  const [customInput, setCustomInput] = useState("")
  const [activeMode, setActiveMode] = useState<SizeMode>(
    memo.question?.viewModes?.[0]?.mode ?? "people"
  )
  const [clarifyOpen, setClarifyOpen] = useState(false)
  const [clarifyInput, setClarifyInput] = useState("")
  const [clarifyLoading, setClarifyLoading] = useState(false)
  const [clarifyHistory, setClarifyHistory] = useState<ClarifyTurn[]>([])
  const [guideOpen, setGuideOpen] = useState(false)
  const [guideText, setGuideText] = useState<string | null>(null)
  const [guideLoading, setGuideLoading] = useState(false)

  useEffect(() => {
    if (memo.question?.viewModes?.[0]) {
      setActiveMode(memo.question.viewModes[0].mode)
    }
    setShowCustom(false)
    setCustomInput("")
    setClarifyOpen(false)
    setClarifyInput("")
    setClarifyHistory([])
    setGuideOpen(false)
    setGuideText(null)
  }, [memo.question?.question])

  function activeOptions(): HearingOption[] {
    const q = memo.question
    if (!q) return []
    if (q.viewModes && q.viewModes.length > 0) {
      const mode = q.viewModes.find((v) => v.mode === activeMode)
      return mode?.options ?? q.options
    }
    return q.options
  }

  async function fetchGuide() {
    const q = memo.question
    if (!q) return
    setGuideOpen(true)
    if (guideText) return
    setGuideLoading(true)
    try {
      const data = await safeFetchJson<{ guide: string }>("/api/guide", {
        userInput: memo.text,
        question: q.question,
        hint: q.hint,
        options: activeOptions().map((o) => ({
          label: o.label,
          description: o.description
        }))
      })
      setGuideText(data.guide)
    } catch (e) {
      setGuideText(`(エラー: ${errorMessage(e, "取得に失敗しました")})`)
    } finally {
      setGuideLoading(false)
    }
  }

  async function askClarify(userQuestion: string) {
    const q = memo.question
    if (!q) return
    const trimmed = userQuestion.trim()
    if (!trimmed) return
    setClarifyLoading(true)
    try {
      const data = await safeFetchJson<{ explanation: string }>("/api/explain", {
        userInput: memo.text,
        question: q.question,
        hint: q.hint,
        options: activeOptions().map((o) => ({
          label: o.label,
          description: o.description
        })),
        userQuestion: trimmed,
        history: clarifyHistory
      })
      setClarifyHistory((prev) => [...prev, { q: trimmed, a: data.explanation }])
      setClarifyInput("")
    } catch (e) {
      const msg = errorMessage(e, "説明の取得に失敗しました")
      setClarifyHistory((prev) => [...prev, { q: trimmed, a: `(エラー: ${msg})` }])
    } finally {
      setClarifyLoading(false)
    }
  }

  const options = useMemo(() => {
    if (!memo.question) return []
    if (memo.question.viewModes && memo.question.viewModes.length > 0) {
      const mode = memo.question.viewModes.find((v) => v.mode === activeMode)
      return mode?.options ?? memo.question.options
    }
    return memo.question.options
  }, [memo.question, activeMode])

  return (
    <div className="h-full flex flex-col">
      <Header onBack={onBack} title={memo.text} onDelete={onDelete} />

      <div className="flex-1 px-5 pt-2 pb-8 overflow-y-auto">
        <AnswersTrail answers={memo.answers} />

        {memo.error && (
          <div
            role="alert"
            className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex flex-col gap-2"
          >
            <span>{memo.error}</span>
            <div className="flex gap-2 flex-wrap">
              <button onClick={onRetry} className="btn-primary text-xs">
                もう一度試す
              </button>
              <button onClick={onSeeResults} className="btn-ghost">
                いまの条件で結果を見る
              </button>
            </div>
          </div>
        )}

        {memo.loading && <LoadingBlock text="質問を考えています..." />}

        {!memo.loading && memo.question && (
          <div>
            <div className="text-[11px] uppercase tracking-[0.15em] text-ink-400 mb-2">
              質問 {memo.answers.length + 1}
            </div>
            <h2 className="text-[22px] font-bold text-ink-900 tracking-tight leading-[1.5] mb-2">
              {memo.question.question}
            </h2>
            {memo.question.hint && (
              <div className="mb-3 text-[13px] text-ink-500 leading-relaxed bg-paper-100 rounded-lg px-3 py-2">
                💡 {memo.question.hint}
              </div>
            )}

            <div className="mb-5">
              <button
                onClick={() => setClarifyOpen((v) => !v)}
                className="btn-ghost text-accent-600 hover:text-accent-500 hover:bg-accent-50"
              >
                {clarifyOpen ? "閉じる" : "💬 詳しく聞く"}
              </button>

              {clarifyOpen && (
                <div className="mt-3 bg-white border border-paper-200 rounded-xl p-3 space-y-3">
                  {clarifyHistory.length > 0 && (
                    <ul className="space-y-3">
                      {clarifyHistory.map((t, i) => (
                        <li key={i} className="space-y-1.5">
                          <div className="text-[12px] text-ink-500 bg-paper-50 rounded-lg px-3 py-2">
                            <span className="text-ink-400">あなた: </span>
                            {t.q}
                          </div>
                          <div className="text-[13px] text-ink-800 leading-relaxed px-3 py-2 border-l-2 border-accent-400">
                            {t.a}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {clarifyLoading && (
                    <div className="text-[12px] text-ink-400 px-3 py-2">
                      考え中...
                    </div>
                  )}

                  <div className="flex gap-2 items-end">
                    <input
                      value={clarifyInput}
                      onChange={(e) => setClarifyInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !clarifyLoading) {
                          askClarify(clarifyInput)
                        }
                      }}
                      placeholder="これはどういうこと? など"
                      aria-label="この質問についての追加質問"
                      className="flex-1 bg-transparent outline-none border-b border-paper-200 focus:border-ink-400 text-sm py-1.5 px-1"
                      disabled={clarifyLoading}
                    />
                    <button
                      onClick={() => askClarify(clarifyInput)}
                      disabled={clarifyLoading || !clarifyInput.trim()}
                      className="btn-primary text-xs px-3 py-1.5"
                    >
                      聞く
                    </button>
                  </div>

                  {clarifyHistory.length === 0 && !clarifyLoading && (
                    <div className="flex flex-wrap gap-1.5">
                      {["これはどういうこと?", "どう違うの?", "どれが一般的?"].map(
                        (suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => askClarify(suggestion)}
                            className="chip"
                          >
                            {suggestion}
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {memo.question.viewModes && memo.question.viewModes.length > 1 && (
              <div
                className="mb-3 flex gap-2"
                role="group"
                aria-label="表示単位の切り替え"
              >
                {memo.question.viewModes.map((v) => {
                  const selected = activeMode === v.mode
                  return (
                    <button
                      key={v.mode}
                      onClick={() => setActiveMode(v.mode)}
                      aria-pressed={selected}
                      className={`chip ${selected ? "chip-selected" : ""}`}
                    >
                      {v.label}
                    </button>
                  )
                })}
              </div>
            )}

            <ul className="space-y-2">
              {options.map((opt) => (
                <li key={opt.value}>
                  <button
                    onClick={() => onAnswer(opt.value, opt.label)}
                    className="option-row"
                  >
                    <span className="check-circle mt-1" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[15px] text-ink-900 leading-tight">
                        {opt.label}
                      </span>
                      {opt.description && (
                        <span className="block text-[12px] text-ink-400 mt-1 leading-snug">
                          {opt.description}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {memo.question.allowCustom && (
              <div className="mt-3">
                {!showCustom ? (
                  <button
                    onClick={() => setShowCustom(true)}
                    className="text-sm text-accent-600 hover:text-accent-500 font-medium px-2"
                  >
                    + 自分で書く
                  </button>
                ) : (
                  <div className="bg-paper-100 rounded-xl flex gap-2 p-2">
                    <input
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="自由に書く"
                      aria-label="この質問の答えを自由に書く"
                      className="flex-1 outline-none text-sm bg-transparent px-2"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && customInput.trim()) {
                          onAnswer(customInput.trim(), customInput.trim())
                        }
                      }}
                    />
                    <button
                      onClick={() =>
                        customInput.trim() &&
                        onAnswer(customInput.trim(), customInput.trim())
                      }
                      className="btn-primary text-xs px-4 py-1.5"
                    >
                      書く
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4">
              <button
                onClick={fetchGuide}
                className="btn-ghost text-ink-600 hover:bg-paper-100 w-full justify-start"
              >
                📖 この質問の選び方ガイド
              </button>

              {guideOpen && (
                <div className="mt-2 bg-paper-100 rounded-xl p-4 text-[13px] text-ink-700 leading-relaxed">
                  {guideLoading ? (
                    <div className="text-center text-ink-400 py-3">ガイドを作成中...</div>
                  ) : (
                    <div className="whitespace-pre-wrap">{guideText}</div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button onClick={onSkip} className="btn-ghost">
                スキップ
              </button>
              <button onClick={onSeeResults} className="btn-ghost text-ink-800">
                ここで結果を見る →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AnswersTrail({ answers }: { answers: HearingAnswer[] }) {
  if (answers.length === 0) return null
  return (
    <div className="mb-6">
      <div className="text-[11px] uppercase tracking-[0.15em] text-ink-400 mb-2">
        これまでの答え
      </div>
      <ul className="space-y-1.5">
        {answers.map((a, i) => (
          <li key={i} className="flex items-baseline gap-2 text-[13px]">
            <span className="text-ink-300 w-3">{i + 1}</span>
            <span className="text-ink-500 truncate">
              {a.question.replace(/[?？]$/, "")}
            </span>
            <span className="text-ink-300">→</span>
            <span className="text-ink-800 font-medium">{a.answer}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ============================== Result ============================== */
function ResultView({
  memo,
  onBack,
  onAskMore,
  onRetry,
  onDelete
}: {
  memo: Memo
  onBack: () => void
  onAskMore: () => void
  onRetry: () => void
  onDelete: () => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="h-full flex flex-col">
      <Header onBack={onBack} title={memo.text} onDelete={onDelete} />

      <div className="flex-1 px-5 pt-2 pb-8 overflow-y-auto">
        {memo.error && (
          <div
            role="alert"
            className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex flex-col gap-2"
          >
            <span>{memo.error}</span>
            <div className="flex gap-2">
              <button onClick={onRetry} className="btn-primary text-xs">
                もう一度試す
              </button>
              <button onClick={onAskMore} className="btn-ghost">
                質問し直す
              </button>
            </div>
          </div>
        )}

        {memo.resultLoading && <LoadingBlock text="あなたに合う商品を絞り込んでいます..." />}

        {!memo.resultLoading && memo.result && (
          <>
            {(memo.result.notices ?? (memo.result.notice ? [memo.result.notice] : [])).map(
              (n, i) => (
                <NoticeBanner key={i} notice={n} />
              )
            )}

            <div className="mb-5 pb-4 border-b border-paper-200">
              <div className="text-[11px] uppercase tracking-[0.15em] text-ink-400 mb-1">
                整理した条件
              </div>
              <div className="text-[14px] text-ink-700 leading-relaxed whitespace-pre-wrap">
                {memo.result.summary_condition}
              </div>
            </div>

            {memo.result.selected.length === 0 ? (
              <EmptyResult onAskMore={onAskMore} onRetry={onRetry} />
            ) : (
              <ul className="space-y-4">
                {memo.result.selected.map((s) => {
                  const expanded = expandedId === s.product_id
                  return (
                    <li
                      key={s.product_id}
                      className="rounded-2xl border border-paper-200 p-4"
                    >
                      <div className="flex gap-3">
                        <ProductImage
                          src={s.product.imageUrl}
                          alt={s.product.title}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[14px] font-semibold text-ink-900 leading-snug line-clamp-2">
                            {s.product.title}
                          </div>
                          <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                            <span className="text-base font-bold text-ink-900">
                              ¥{s.product.price.toLocaleString()}
                            </span>
                            {s.product.rating > 0 && (
                              <span className="text-[11px] text-ink-500">
                                ★{s.product.rating.toFixed(1)}
                                {s.product.reviewCount > 0 && (
                                  <>（{s.product.reviewCount.toLocaleString()}件）</>
                                )}
                              </span>
                            )}
                          </div>
                          {s.product.shopName && (
                            <div className="mt-0.5 text-[11px] text-ink-500 truncate">
                              {s.product.shopName}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 text-[13px] text-ink-800 leading-relaxed">
                        {s.one_liner}
                      </div>

                      <div className="mt-3 space-y-2">
                        <div>
                          <div className="text-[11px] text-check-600 mb-0.5 font-medium">
                            向いている人
                          </div>
                          <ul className="text-[13px] text-ink-700 space-y-0.5">
                            {s.fits.map((f, i) => (
                              <li key={i}>・{f}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="text-[11px] text-accent-600 mb-0.5 font-medium">
                            向いていない人
                          </div>
                          <ul className="text-[13px] text-ink-500 space-y-0.5">
                            {s.unfits.map((f, i) => (
                              <li key={i}>・{f}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {expanded && (
                        <div className="mt-3 text-[13px] text-ink-500 leading-relaxed">
                          <div className="text-[11px] uppercase tracking-[0.15em] text-ink-400 mb-1">
                            選んだ理由
                          </div>
                          {s.reason}
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t border-paper-200 flex items-center justify-between gap-2">
                        <button
                          onClick={() =>
                            setExpandedId(expanded ? null : s.product_id)
                          }
                          className="btn-ghost"
                          aria-expanded={expanded}
                        >
                          {expanded ? "閉じる" : "もっと詳しく"}
                        </button>
                        <AffiliateCta
                          url={s.product.affiliateUrl}
                          isMock={isMockNotice(memo.result)}
                          onClick={() =>
                            logAffiliateClick({
                              product_id: s.product_id,
                              keyword: memo.result?.keyword,
                              placement: "result",
                              notice: firstNoticeKind(memo.result),
                              shop: s.product.shopName,
                              price: s.product.price
                            })
                          }
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            {memo.result.selected.length > 0 && (
              <div className="mt-6 rounded-2xl border border-paper-200 p-4 flex items-center justify-between">
                <div className="text-[13px] text-ink-600 leading-tight">
                  もっと絞り込みたい?
                </div>
                <button onClick={onAskMore} className="btn-accent">
                  さらに質問
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function NoticeBanner({ notice }: { notice: RecommendNotice }) {
  const isMock = notice.kind === "mock"
  return (
    <div
      role="status"
      className={`mb-4 rounded-xl px-4 py-3 text-[12px] leading-relaxed border ${
        isMock
          ? "bg-accent-50 border-accent-400/60 text-accent-600"
          : "bg-paper-100 border-paper-200 text-ink-600"
      }`}
    >
      <span className="font-semibold mr-1">
        {isMock ? "デモ表示中" : "お知らせ"}
      </span>
      {notice.message}
    </div>
  )
}

function EmptyResult({
  onAskMore,
  onRetry
}: {
  onAskMore: () => void
  onRetry: () => void
}) {
  return (
    <div className="py-8 text-center">
      <div className="text-sm text-ink-700 mb-2">
        条件に合う商品が見つかりませんでした。
      </div>
      <div className="text-[12px] text-ink-500 mb-5 leading-relaxed">
        価格帯や用途の条件を少し緩めると、見つかりやすくなります。
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        <button onClick={onAskMore} className="btn-primary text-xs">
          条件を追加して再検索
        </button>
        <button onClick={onRetry} className="btn-ghost">
          同じ条件でもう一度
        </button>
      </div>
    </div>
  )
}

function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false)
  if (src && !failed) {
    return (
      <div className="w-20 h-20 flex-shrink-0 bg-paper-100 rounded-lg relative overflow-hidden">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="80px"
          className="object-contain"
          onError={() => setFailed(true)}
          unoptimized={false}
        />
      </div>
    )
  }
  return (
    <div
      aria-hidden
      className="w-20 h-20 rounded-lg flex-shrink-0 bg-paper-100 flex items-center justify-center text-[10px] text-ink-400"
    >
      No image
    </div>
  )
}

function AffiliateCta({
  url,
  isMock,
  onClick
}: {
  url: string
  isMock: boolean
  onClick?: () => void
}) {
  if (isMock) {
    return (
      <span
        aria-disabled
        className="inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-xs bg-paper-200 text-ink-500 cursor-not-allowed"
      >
        デモ（リンクなし）
      </span>
    )
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer sponsored nofollow"
      className="btn-primary text-xs"
      onClick={onClick}
      onAuxClick={(e) => {
        // only middle-click (button 1) should count as an affiliate click
        if (e.button === 1) onClick?.()
      }}
    >
      <span aria-hidden className="text-[10px] opacity-80 mr-1">PR</span>
      楽天で見る →
    </a>
  )
}

/* ============================== shared ============================== */
function Header({
  onBack,
  title,
  onDelete
}: {
  onBack: () => void
  title: string
  onDelete?: () => void
}) {
  return (
    <header className="flex items-center gap-2 px-3 pt-4 pb-3 border-b border-paper-200">
      <button onClick={onBack} className="btn-ghost" aria-label="前の画面に戻る">
        ← 戻る
      </button>
      <div className="flex-1 text-center text-[13px] font-semibold text-ink-800 truncate px-2">
        {title}
      </div>
      {onDelete ? (
        <button
          onClick={() => {
            if (confirm("このメモを削除しますか?")) onDelete()
          }}
          className="btn-ghost"
          aria-label="このメモを削除"
        >
          消す
        </button>
      ) : (
        <span className="w-12" />
      )}
    </header>
  )
}

function LoadingBlock({ text }: { text: string }) {
  return (
    <div className="py-12 text-center">
      <div className="flex items-center justify-center gap-1.5 mb-3">
        <span
          className="w-2 h-2 rounded-full bg-ink-400 animate-pulse"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="w-2 h-2 rounded-full bg-ink-400 animate-pulse"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="w-2 h-2 rounded-full bg-ink-400 animate-pulse"
          style={{ animationDelay: "300ms" }}
        />
      </div>
      <div className="text-sm text-ink-400">{text}</div>
    </div>
  )
}
