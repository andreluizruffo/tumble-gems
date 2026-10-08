import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // relative paths, so the build works under /tumble-gems/ on GitHub Pages
  base: './',
})
