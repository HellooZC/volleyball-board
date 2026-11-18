import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 用相对路径，放到 GitHub Pages 的子路径（/repo名/）也能正常加载
  base: './',
  server: { host: '0.0.0.0' },
})
