import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Check, Trash2, Lock, Unlock } from 'lucide-react'
import './App.css'

function App() {
  const [priceList, setPriceList] = useState('')
  const [productList, setProductList] = useState('')
  const [matchResult, setMatchResult] = useState('')
  const [stats, setStats] = useState({ matched: 0, unmatched: 0, total: 0 })
  const [copied, setCopied] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [lockedResult, setLockedResult] = useState('')

  // --- 核心清除功能 (使用 useCallback 確保穩定性) ---
  const clearAll = useCallback(() => {
    console.log("🚀 觸發清除功能！")

    // 1. 清空所有狀態
    setPriceList('')
    setProductList('')
    setMatchResult('')
    setLockedResult('')
    setStats({ matched: 0, unmatched: 0, total: 0 })
    setIsLocked(false)

    // 2. 滾動到頂部
    window.scrollTo({ top: 0, behavior: 'smooth' })

    // 3. 強制移除輸入框焦點 (避免游標還在閃爍)
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }, [])

  // --- 🌟 關鍵修復：全域強制 ESC 監聽器 ---
  useEffect(() => {
    const handleGlobalKeyDown = (event) => {
      // 檢查 1: 如果正在打中文 (IME 輸入法模式)，不要清除
      if (event.nativeEvent.isComposing) {
        return
      }

      // 檢查 2: 確認按鍵是 ESC
      if (event.key === 'Escape') {
        console.log("⚡ 捕捉到 ESC 鍵")

        // 阻止瀏覽器預設行為
        event.preventDefault()

        // 執行清除
        clearAll()
      }
    }

    // ⚠️ 重點：使用 { capture: true }
    // 這會讓事件在到達 Textarea 之前就被 Window 攔截
    window.addEventListener('keydown', handleGlobalKeyDown, { capture: true })

    // 清理監聽器
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true })
    }
  }, [clearAll])

  const handleMatch = () => {
    if (isLocked) return

    const prices = priceList.split('\n').filter(line => line.trim())
    const products = productList.split('\n').filter(line => line.trim())

    const priceMap = new Map()
    prices.forEach(line => {
      const parts = line.split('\t')
      if (parts.length >= 2) {
        const name = parts[0].trim()
        const price = parts[1].trim()
        priceMap.set(name, price)
      }
    })

    let matchedCount = 0
    let unmatchedCount = 0
    const results = products.map(productName => {
      const name = productName.trim()
      if (priceMap.has(name)) {
        matchedCount++
        return priceMap.get(name)
      } else {
        unmatchedCount++
        return 'N/A'
      }
    })

    setMatchResult(results.join('\n'))
    setStats({
      matched: matchedCount,
      unmatched: unmatchedCount,
      total: products.length
    })
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(isLocked ? lockedResult : matchResult)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy!', err)
    }
  }

  const toggleLock = () => {
    if (!isLocked) {
      setLockedResult(matchResult)
    }
    setIsLocked(!isLocked)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Price Matcher</h1>
            <p className="text-slate-500">快速對比產品價格</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={clearAll}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              清除全部 (ESC)
            </Button>
            <Button 
              variant={isLocked ? "destructive" : "secondary"}
              onClick={toggleLock}
              className="flex items-center gap-2"
            >
              {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              {isLocked ? "解鎖編輯" : "鎖定結果"}
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>價格清單 (名稱 [Tab] 價格)</CardTitle>
              <CardDescription>從 Excel 貼上兩欄數據</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="產品 A	100&#10;產品 B	200"
                className="h-[300px] font-mono"
                value={priceList}
                onChange={(e) => setPriceList(e.target.value)}
                disabled={isLocked}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>待查產品清單</CardTitle>
              <CardDescription>貼上需要查詢價格的產品名稱</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="產品 B&#10;產品 A"
                className="h-[300px] font-mono"
                value={productList}
                onChange={(e) => setProductList(e.target.value)}
                disabled={isLocked}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button 
            size="lg" 
            className="w-full md:w-64 text-lg h-12"
            onClick={handleMatch}
            disabled={isLocked || !priceList || !productList}
          >
            開始對比
          </Button>
        </div>

        {(matchResult || isLocked) && (
          <Card className="border-2 border-blue-100">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>對比結果</CardTitle>
                <CardDescription>
                  共 {stats.total} 項 | 
                  <span className="text-green-600 font-medium"> 已找到: {stats.matched} </span> | 
                  <span className="text-red-600 font-medium"> 未找到: {stats.unmatched} </span>
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={copyToClipboard}
                className="flex items-center gap-2"
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : null}
                {copied ? '已複製' : '複製結果'}
              </Button>
            </CardHeader>
            <CardContent>
              <Textarea
                readOnly
                className="h-[300px] font-mono bg-white"
                value={isLocked ? lockedResult : matchResult}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default App
