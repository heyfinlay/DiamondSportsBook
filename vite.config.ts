import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@app": path.resolve(__dirname, "src/app"),
      "@domains": path.resolve(__dirname, "src/domains"),
      "@lib": path.resolve(__dirname, "src/lib"),
      "@config": path.resolve(__dirname, "src/config"),
      "@styles": path.resolve(__dirname, "src/styles")
    }
  },
  server: {
    port: 5173
  }
});
