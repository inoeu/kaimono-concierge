import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: {
          50: "#fafaf7",
          100: "#f4f3ee",
          200: "#e8e6de",
          300: "#d4d1c4"
        },
        ink: {
          300: "#c2beb3",
          400: "#8e8a7f",
          500: "#6b665c",
          600: "#4a4640",
          700: "#2d2a25",
          800: "#1f1d1a",
          900: "#111010"
        },
        accent: {
          50: "#fdf5f0",
          100: "#fae8dd",
          400: "#e19a7a",
          500: "#d17a54",
          600: "#b65a37"
        },
        check: {
          500: "#7a9d7e",
          600: "#5e8062"
        }
      },
      boxShadow: {
        soft: "0 1px 2px rgba(23, 20, 16, 0.04), 0 8px 24px rgba(23, 20, 16, 0.06)",
        card: "0 1px 3px rgba(23, 20, 16, 0.06), 0 12px 40px rgba(23, 20, 16, 0.08)"
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "Hiragino Sans",
          "Hiragino Kaku Gothic ProN",
          "Noto Sans JP",
          "system-ui",
          "sans-serif"
        ],
        memo: [
          "Hiragino Mincho ProN",
          "YuMincho",
          "Yu Mincho",
          "ui-serif",
          "serif"
        ]
      }
    }
  },
  plugins: []
}

export default config
