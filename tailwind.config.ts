import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#131313",
        surface: {
          lowest: "#0e0e0e",
          low: "#1c1b1b",
          DEFAULT: "#20201f",
          high: "#2a2a2a",
          highest: "#353535",
          bright: "#393939"
        },
        outline: {
          DEFAULT: "#849495",
          variant: "#3b494b"
        },
        primary: {
          DEFAULT: "#dbfcff",
          container: "#00f0ff",
          fixed: "#7df4ff",
          dim: "#00dbe9"
        },
        on: {
          surface: "#e5e2e1",
          subtle: "#b9cacb",
          primary: "#00363a"
        },
        danger: "#ffb4ab",
        neutral: {
          950: "#05060a"
        }
      },
      fontFamily: {
        sans: ["'Inter'", "ui-sans-serif", "system-ui"],
        headline: ["'Space Grotesk'", "ui-sans-serif", "system-ui"],
        body: ["'Inter'", "ui-sans-serif", "system-ui"],
        label: ["'Inter'", "ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: []
};

export default config;
