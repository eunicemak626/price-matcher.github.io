import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
// 👇 新增這一行：引入 url 套件
import { fileURLToPath } from 'url'

// 👇 新增這兩行：手動定義 __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  // 確保路徑正確
  base: '/price-matcher.github.io/',
  
  // 基本的 React plugin
  plugins: [react()],
  
  resolve: {
    alias: {
      // 現在 __dirname 已經定義好了，這裡就不會報錯了
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
