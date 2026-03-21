import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#111417",
        surface: {
          lowest: "#0c0e12",
          low: "#191c1f",
          DEFAULT: "#1d2023",
          high: "#282a2e",
          highest: "#323539",
          bright: "#37393d"
        },
        outline: {
          DEFAULT: "#849495",
          variant: "#3a494b"
        },
        primary: {
          DEFAULT: "#e1fdff",
          container: "#00f2ff",
          fixed: "#74f5ff",
          dim: "#00dbe7"
        },
        on: {
          surface: "#e1e2e7",
          subtle: "#b9cacb",
          primary: "#00363a"
        },
        danger: "#ffb4ab",
        brand: {
          DEFAULT: "#10b981",
          foreground: "#042f1f"
        },
        gold: {
          DEFAULT: "#f5c542",
          soft: "#f9e7b3"
        },
        neutral: {
          950: "#05060a"
        }
      },
      fontFamily: {
        sans: ["'Inter'", "ui-sans-serif", "system-ui"],
        headline: ["'Manrope'", "ui-sans-serif", "system-ui"],
        body: ["'Inter'", "ui-sans-serif", "system-ui"],
        label: ["'Inter'", "ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: []
};

export default config;
