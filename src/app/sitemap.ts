import type { MetadataRoute } from "next"
import { allCategoryItems } from "@/lib/categories"

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://kaimono.example"

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, priority: 1 },
    { url: `${SITE_URL}/category`, lastModified: now, priority: 0.7 },
    { url: `${SITE_URL}/privacy`, lastModified: now, priority: 0.2 },
    { url: `${SITE_URL}/terms`, lastModified: now, priority: 0.2 }
  ]
  for (const item of allCategoryItems()) {
    entries.push({
      url: `${SITE_URL}/category/${item.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6
    })
  }
  return entries
}
