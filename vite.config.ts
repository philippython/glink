import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // The API runs on :8787 (npm run server); the dev server forwards /api to it.
    proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: false } },
  },
})
