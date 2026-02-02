import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 最小化配置 - 用于调试构建问题
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 8008,
    proxy: {
      '/api': {
        target: 'http://localhost:8017',
        changeOrigin: true,
      }
    }
  },
  build: {
    target: 'esnext',
    minify: false,
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
  }
})
