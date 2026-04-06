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
        secure: true,
        // Preserve encoded characters like %22 (quotes) in query strings
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Vite's proxy sometimes decodes %22 back to " which SS rejects.
            // Force the raw URL through unchanged.
            const raw = req.url?.replace(/^\/api\/semantic-scholar/, '')
            if (raw) proxyReq.path = raw
          })
        }
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