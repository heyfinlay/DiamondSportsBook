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
          DEFAULT: "#1e40ff",
          foreground: "#f5f7ff"
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
