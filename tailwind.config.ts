import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
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
        sans: ["'Sora'", "ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: []
};

export default config;
