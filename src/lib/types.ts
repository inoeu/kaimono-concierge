export type Product = {
  id: string
  source: "rakuten"
  title: string
  price: number
  imageUrl: string
  rating: number
  reviewCount: number
  shopName: string
  affiliateUrl: string
  caption: string
}

export type HearingAnswer = {
  question: string
  answer: string
}

export type SizeMode = "people" | "liter"

export type HearingOption = {
  label: string
  value: string
  description?: string
}

export type HearingQuestion = {
  id: string
  question: string
  hint?: string
  options: HearingOption[]
  allowCustom: boolean
  allowSkip: boolean
  viewModes?: { mode: SizeMode; label: string; options: HearingOption[] }[]
}

export type RankedProduct = {
  product_id: string
  one_liner: string
  fits: string[]
  unfits: string[]
  reason: string
}

export type RecommendNoticeKind = "mock" | "fallback-search" | "fallback-rank" | "empty"

export type RecommendNotice = {
  kind: RecommendNoticeKind
  message: string
}

export type RecommendResponse = {
  summary_condition: string
  selected: (RankedProduct & { product: Product })[]
  notice?: RecommendNotice | null
  notices?: RecommendNotice[]
  keyword?: string
}
