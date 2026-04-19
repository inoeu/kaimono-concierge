import type { Product } from "./types"

const KATAKANA_RANGE = /[\u30A0-\u30FF]/
const ALL_KATAKANA = /^[\u30A0-\u30FF]+$/

/**
 * Decide whether a single keyword appears in `title` as a genuine token,
 * rather than as a substring of a longer compound.
 *
 * The rule is intentionally narrow: only activated for short katakana
 * keywords (<=5 chars). Other scripts (kanji, hiragana, latin) rarely
 * collide as substrings in Japanese product titles, so we pass them through.
 *
 * For short katakana keywords, we require the keyword to appear either:
 *   - at the very start of the title, or
 *   - immediately after a non-katakana character
 *
 * That filters out "ドリップコーヒー" when searching "リップ" (preceded by
 * "ド", still katakana), while keeping "リップモンスター" (preceded by a
 * space) and "液晶テレビ" (preceded by "晶", kanji).
 */
export function isKeywordGenuineInTitle(title: string, keyword: string): boolean {
  if (!title || !keyword) return false
  if (!title.includes(keyword)) return false
  const isShortKana = keyword.length <= 5 && ALL_KATAKANA.test(keyword)
  if (!isShortKana) return true
  for (let i = 0; i < title.length; i++) {
    const sub = title.slice(i, i + keyword.length)
    if (sub !== keyword) continue
    const before = i === 0 ? "" : title[i - 1]
    if (before === "" || !KATAKANA_RANGE.test(before)) {
      return true
    }
  }
  return false
}

/**
 * Keep only products whose title looks genuinely related to the query.
 *
 * Rakuten does substring matching, so queries like "リップ" can pull in
 * "ドリップコーヒー". We apply the per-keyword genuine-match check on a
 * best-effort basis: if the full keyword string (possibly multi-word) has
 * any katakana token short enough to trigger the rule, we require every
 * such token to be a genuine match in the title.
 */
export function filterByRelevance(items: Product[], keyword: string): Product[] {
  if (!keyword) return items
  const tokens = keyword
    .split(/[\s\u3000]+/)
    .map((t) => t.trim())
    .filter(Boolean)
  const hotTokens = tokens.filter(
    (t) => t.length <= 5 && ALL_KATAKANA.test(t)
  )
  if (hotTokens.length === 0) return items
  return items.filter((p) =>
    hotTokens.every((t) => isKeywordGenuineInTitle(p.title, t))
  )
}
