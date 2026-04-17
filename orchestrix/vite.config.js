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
        secure: true,
        // Route to the correct SS API endpoint and preserve encoded characters
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Strip the proxy prefix, keeping the query string intact
            let qs = req.url.replace(/^\/api\/semantic-scholar/, '')

            // Detect match vs search endpoint from the ?match=true param
            const isMatch = /[?&]match=true/.test(qs)
            const basePath = isMatch
              ? '/graph/v1/paper/search/match'
              : '/graph/v1/paper/search'

            // Remove the match param (SS API doesn't expect it)
            qs = qs.replace(/([?&])match=true&?/, '$1').replace(/[?&]$/, '')

            proxyReq.path = basePath + qs
          })
        }
      },
      '/api/arxiv': {
        target: 'https://export.arxiv.org',
        changeOrigin: true,
        secure: true,
        // Route to the correct arXiv API query endpoint
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const qs = req.url.replace(/^\/api\/arxiv/, '')
            proxyReq.path = '/api/query' + qs
          })
        }
      }
    }
  }
})