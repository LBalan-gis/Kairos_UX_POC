import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('three') || id.includes('@react-three') || id.includes('postprocessing')) {
            return 'three-vendor'
          }
          if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
            return 'chart-vendor'
          }
          if (id.includes('framer-motion')) {
            return 'motion-vendor'
          }
          if (id.includes('react') || id.includes('scheduler')) {
            return 'react-vendor'
          }
          return 'vendor'
        },
      },
    },
  },
})
