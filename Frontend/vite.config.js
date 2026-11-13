import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],

  base: mode === 'production' ? '/static/' : '/',

  build: {
    outDir: '../Backend/static_frontend',
    emptyOutDir: true,
  },
}))
