import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  // ⚠️ 這一行非常重要，確保路徑正確
  base: '/price-matcher.github.io/',
  
  // ⚠️ 我移除了 tailwindcss()，因為這會導致你的舊專案報錯
  plugins: [react()], 
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
