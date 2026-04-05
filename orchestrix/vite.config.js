import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/semantic-scholar': {
        target: 'https://api.semanticscholar.org',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/semantic-scholar/, ''),
        secure: true
      },
      '/api/arxiv': {
        target: 'https://export.arxiv.org',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/arxiv/, ''),
        secure: true
      }
    }
  }
})