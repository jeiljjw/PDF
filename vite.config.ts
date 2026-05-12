import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1500,
    cssCodeSplit: false, // 모든 CSS를 하나의 파일로 번들링하여 로딩 순서 보장
    rollupOptions: {
      output: {
        manualChunks: undefined, // CSS가 JS 청크와 함께 로드되는 것을 방지
      },
    },
  },
  css: {
    devSourcemap: true,
  },
  server: {
    host: '0.0.0.0', // 모든 인터페이스에서 접근 가능하도록
    port: 8080, // 일반적으로 사용되는 포트
    strictPort: false, // 포트가 사용 중이면 자동으로 다른 포트 사용
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  },
})
