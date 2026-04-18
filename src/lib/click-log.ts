"use client"

import type { RecommendNotice } from "./types"

export type ClickPayload = {
  product_id: string
  keyword?: string
  placement: "home" | "result"
  notice?: RecommendNotice["kind"]
  shop?: string
  price?: number
}

export function logAffiliateClick(payload: ClickPayload): void {
  if (typeof window === "undefined") return
  try {
    const body = JSON.stringify(payload)
    let queued = false
    if (
      "sendBeacon" in navigator &&
      typeof navigator.sendBeacon === "function"
    ) {
      const blob = new Blob([body], { type: "application/json" })
      // sendBeacon returns false if the queue is full or blob is too big
      queued = navigator.sendBeacon("/api/click", blob)
    }
    if (queued) return
    void fetch("/api/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body
    }).catch(() => {})
  } catch {
    // never block the click
  }
}
