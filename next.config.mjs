/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Rakuten serves product images from several CDN hosts. We whitelist the
    // patterns that actually show up in the Ichiba API response, using
    // wildcards where the subdomain varies (thumbnail.image.rakuten.co.jp,
    // image.rakuten.co.jp, shop.r10s.jp, tshop.r10s.jp, r.r10s.jp, ...).
    remotePatterns: [
      { protocol: "https", hostname: "**.rakuten.co.jp" },
      { protocol: "https", hostname: "rakuten.co.jp" },
      { protocol: "https", hostname: "**.r10s.jp" },
      { protocol: "https", hostname: "r10s.jp" },
      { protocol: "https", hostname: "**.r-wss.net" }
    ]
  }
}

export default nextConfig
