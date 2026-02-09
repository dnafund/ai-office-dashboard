import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflaredTunnel } from './vite-plugin-tunnel.js'

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflaredTunnel()],
  server: {
    host: true,
    port: 5175,
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
