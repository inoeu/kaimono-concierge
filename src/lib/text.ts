/**
 * Normalize free-text from the user before using it in prompts, cache keys,
 * or URL params.
 * - strips URLs, email addresses, markdown fences, long runs of punctuation
 * - applies NFKC (full-width → half-width, etc.)
 * - collapses whitespace and hard-limits length
 *
 * The output is meant to be treated as *data*, not further prompt text.
 */
export function normalizeUserText(input: string, maxLen = 500): string {
  if (!input) return ""
  let s = input.normalize("NFKC")
  s = s.replace(/https?:\/\/\S+/gi, " ")
  s = s.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, " ")
  s = s.replace(/```[\s\S]*?```/g, " ")
  s = s.replace(/([!?.,#=*_\-`~])\1{2,}/g, "$1")
  s = s.replace(/\s+/g, " ").trim()
  return s.slice(0, maxLen)
}
