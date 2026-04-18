import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      // macOS resource-fork sidecars that live next to files on external drives
      "**/._*"
    ]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  }
})
