import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path for GitHub Pages deployment
  // Change 'whistle-note' to your actual repository name
  base: process.env.NODE_ENV === 'production' ? '/whistle-note/' : '/',
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
