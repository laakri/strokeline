import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ["kokoro-js"],
  },
  server: {
    proxy: {
      "/hf/": {
        target: "https://huggingface.co",
        changeOrigin: true,
        followRedirects: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/hf\//, "/"),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
})
