import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
  // changeOrigin:false mantém Host=localhost:5173, igual ao Origin; com true o servidor responderia 403 a todo POST
  server: {
    proxy: {
      "/api": { target: "http://127.0.0.1:8765", changeOrigin: false },
      "/projects": { target: "http://127.0.0.1:8765", changeOrigin: false },
    },
  },
  test: { environment: "jsdom", setupFiles: ["./src/test/setup.ts"], css: false },
})
