import { useState, useEffect } from 'react'
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

  // // ==========================================
  // // 核心解析邏輯 (Tab 優先 + Part Number 修復版)
  // // ==========================================

  const parsePriceList = (text) => {
    const lines = text.trim().split('\n')
    const prices = []
    let currentCategory = 'DEFAULT'

    const headerKeywords = [
      'CAP', 'CAPACITY', '容量',
      'QTY', 'QUANTITY', '數量',
      'HKD', 'USD', 'CNY', 'RMB', 'PRICE', '人民幣'
    ]

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      const upperLine = trimmed.toUpperCase()

      // 1. 檢查是否為標題行
      let firstKeywordIndex = -1
      for (const kw of headerKeywords) {
        const idx = upperLine.indexOf(kw)
        if (idx !== -1) {
          if (firstKeywordIndex === -1 || idx < firstKeywordIndex) {
            firstKeywordIndex = idx
          }
        }
      }

      if (firstKeywordIndex !== -1) {
        const potentialCategory = trimmed.substring(0, firstKeywordIndex).trim()
        if (potentialCategory.length > 0) {
          currentCategory = potentialCategory
        }
        continue
      }

      // 2. 檢查是否為純類別行
      const chineseCategories = ['IPAD 原封沒激活', 'IPAD 激活全套有鎖', 'LOCKED', 'UNLOCKED']
      const isChineseCategory = chineseCategories.some(cat => upperLine.includes(cat))

      if ((!trimmed.includes('\t') && trimmed === upperLine && trimmed.length < 50) || isChineseCategory) {
        const parts = trimmed.split(/\s+/)
        const lastPart = parts[parts.length - 1]
        if (isNaN(parseFloat(lastPart))) {
          currentCategory = trimmed
          continue
        }
      }

      // 3. 數據行處理
      let name = ''
      let price = ''

      if (trimmed.includes('\t')) {
        const parts = trimmed.split('\t')
        price = parts[parts.length - 1].trim()
        name = parts.slice(0, -1).join(' ').trim()
      } else {
        const parts = trimmed.split(/\s+/)
        if (parts.length >= 2) {
          price = parts[parts.length - 1].trim()
          name = parts.slice(0, -1).join(' ').trim()
        }
      }

      if (name && price && !isNaN(parseFloat(price.replace(/,/g, '')))) {
        const fullName = currentCategory !== 'DEFAULT' ? `${currentCategory} ${name}` : name
        prices.push({
          originalName: name,
          fullName: fullName.replace(/\s+/g, ' ').trim(),
          price: price
        })
      }
    }
    return prices
  }

  const handleMatch = () => {
    if (isLocked) return

    const parsedPrices = parsePriceList(priceList)
    const products = productList.split('\n').filter(line => line.trim())

    let matchedCount = 0
    let unmatchedCount = 0

    const results = products.map(productName => {
      const searchName = productName.trim().toUpperCase().replace(/\s+/g, '')
      
      // 優先精確匹配 fullName
      let match = parsedPrices.find(p => 
        p.fullName.toUpperCase().replace(/\s+/g, '') === searchName
      )

      // 次優先精確匹配 originalName
      if (!match) {
        match = parsedPrices.find(p => 
          p.originalName.toUpperCase().replace(/\s+/g, '') === searchName
        )
      }

      // 最後模糊匹配 (關鍵字包含)
      if (!match) {
        match = parsedPrices.find(p => {
          const pFull = p.fullName.toUpperCase().replace(/\s+/g, '')
          return pFull.includes(searchName) || searchName.includes(pFull)
        })
      }

      if (match) {
        matchedCount++
        return match.price
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

  const clearAll = () => {
    setPriceList('')
    setProductList('')
    setMatchResult('')
    setLockedResult('')
    setStats({ matched: 0, unmatched: 0, total: 0 })
    setIsLocked(false)
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
              清除全部
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
