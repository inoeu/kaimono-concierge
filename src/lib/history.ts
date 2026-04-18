"use client"

export type HistoryEntry = {
  id: string
  userInput: string
  createdAt: number
}

const KEY = "kaimono:history:v1"

function isEntryShape(x: unknown): x is HistoryEntry {
  if (!x || typeof x !== "object") return false
  const e = x as Record<string, unknown>
  return (
    typeof e.id === "string" &&
    typeof e.userInput === "string" &&
    typeof e.createdAt === "number"
  )
}

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isEntryShape) as HistoryEntry[]
  } catch {
    return []
  }
}

export function addHistory(userInput: string) {
  if (typeof window === "undefined") return
  const entry: HistoryEntry = {
    id: newId(),
    userInput: userInput.slice(0, 500),
    createdAt: Date.now()
  }
  try {
    const current = loadHistory()
    const next = [entry, ...current].slice(0, 20)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // ignore quota / privacy-mode errors
  }
}

export function clearHistory() {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
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
