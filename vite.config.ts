import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Older Android Chrome / WebView friendly output.
    target: 'es2020',
    cssTarget: 'chrome80',
  },
})
