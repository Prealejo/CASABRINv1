import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El proxy /api evita problemas de CORS en desarrollo apuntando al backend .NET.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5080',
        changeOrigin: true
      }
    }
  }
})
