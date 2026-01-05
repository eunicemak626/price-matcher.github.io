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

  // ==========================================
  // 核心解析邏輯 (還原至原本有效的版本)
  // ==========================================

  const parsePriceList = (text) => {
    const lines = text.trim().split('\n')
    const prices = []
    let currentCategory = 'DEFAULT'

    // 定義標題關鍵字
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

      // 3. 解析數據行
      const parts = trimmed.split(/\s+/)
      
      if (parts.length >= 3) {
        let price = 0
        let qty = 0
        let capacity = ''
        let modelParts = []

        if (!isNaN(parseFloat(parts[parts.length - 1]))) {
            price = parseFloat(parts[parts.length - 1])
        }

        if (parts.length >= 2 && !isNaN(parseInt(parts[parts.length - 2]))) {
            qty = parseInt(parts[parts.length - 2])
        }

        let modelEndIndex = parts.length - 3
        const secondToLastPart = parts[parts.length - 3]
        if (secondToLastPart) {
            const isCapacity = secondToLastPart.toUpperCase().match(/\d+(GB|TB)$/)
            const isPartNum = /^[A-Z0-9]{6,10}$/i.test(secondToLastPart)
            
            if (isCapacity || isPartNum) {
                capacity = secondToLastPart
                modelEndIndex = parts.length - 4
            }
        }

        modelParts = parts.slice(0, modelEndIndex + 1)
        const model = modelParts.join(' ')

        if (model && price > 0) {
            prices.push({
              category: currentCategory,
              model: model,
              capacity: capacity,
              qty: qty,
              price: price
            })
        }
      }
    }

    return prices
  }

  // ==========================================
  // 輔助功能函數
  // ==========================================

  const parseProductList = (text) => {
    const lines = text.trim().split('\n')
    const products = []
    let currentCategory = 'DEFAULT'

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      const upperLine = trimmed.toUpperCase()
      if (upperLine.includes('CAP') && upperLine.includes('QTY') && upperLine.includes('HKD')) {
        continue
      }

      const chineseCategories = ['IPAD 原封沒激活', 'IPAD 激活全套有鎖']
      if ((!trimmed.includes('\t') && trimmed === trimmed.toUpperCase()) || chineseCategories.includes(trimmed)) {
        currentCategory = trimmed
        continue
      }

      const parts = trimmed.split('\t')
      if (parts.length >= 2) {
        const lineNum = parts[0].trim()
        let remarks = ''
        let description = ''
        
        if (parts.length === 2) {
          description = parts[1].trim()
        } else if (parts.length >= 3) {
          remarks = parts[1].trim()
          description = parts[2].trim()
        }
        
        if (lineNum && description) {
          products.push({
            lineNum,
            remarks,
            description,
            category: currentCategory
          })
        }
      }
    }
    return products
  }

  const extractCapacity = (description) => {
    const capacityMatch = description.match(/\b(\d+(?:GB|TB))\b/i)
    return capacityMatch ? capacityMatch[1].toUpperCase() : ''
  }

  const extractModelName = (text, removeColor = false) => {
    let model = text.replace(/\b\d+(?:GB|TB)\b/gi, '').trim()
    
    if (removeColor) {
      const colors = ['BLACK', 'WHITE', 'BLUE', 'ORANGE', 'SILVER', 'GOLD', 'NATURAL', 'DESERT', 
                      'PINK', 'ULTRAMARINE', 'GRAY', 'GREY', 'GREEN', 'RED', 'PURPLE', 
                      'YELLOW', 'LAVENDER', 'SAGE', 'MIDNIGHT', 'STARLIGHT', 'TITANIUM',
                      'SPACE', 'ROSE', 'CORAL', 'TEAL', 'INDIGO', 'CRIMSON', 'VZ']
      
      for (const color of colors) {
        const regex = new RegExp(`\\b${color}\\b\\s*$`, 'i')
        model = model.replace(regex, '').trim()
      }
    }
    
    return model.toUpperCase().replace(/\s+/g, ' ')
  }

  const needsColorMatch = (category, priceModel = '') => {
    const cat = category.toUpperCase()
    if (cat.includes('UNLOCKED')) return true
    if (cat.includes('LOCKED')) {
      return cat.includes('N/A') || cat.includes('ACT')
    }
    if (cat === 'DEFAULT') return false
    return true
  }

  const needsCapacityMatch = (description) => {
    return /\b\d+(?:GB|TB)\b/i.test(description)
  }

  const modelsMatch = (productModel, priceModel) => {
    const p = productModel.toUpperCase().trim()
    const pr = priceModel.toUpperCase().trim()
    
    if (p === pr) return true
    
    const pWords = p.split(/\s+/).filter(w => w.length > 0)
    const prWords = pr.split(/\s+/).filter(w => w.length > 0)
    
    if (pWords.length !== prWords.length) return false
    
    for (let i = 0; i < pWords.length; i++) {
      if (pWords[i] !== prWords[i]) return false
    }
    return true
  }

  const applyDeductions = (basePrice, remarks) => {
    let finalPrice = basePrice
    finalPrice -= 15 // Basic deduction
    
    const deductions = {
      '小花': -100, '花機': -150, '大花': -350, '舊機': -350,
      '低保': -100, '過保': -200, '黑機': -200, '配置鎖': -300
    }
    
    for (const [keyword, amount] of Object.entries(deductions)) {
      if (remarks.includes(keyword)) {
        finalPrice += amount
      }
    }
    return finalPrice
  }

  // ==========================================
  // 主匹配邏輯
  // ==========================================

  const matchProducts = () => {
    const prices = parsePriceList(priceList)
    const products = parseProductList(productList)
    
    const results = []
    let matchedCount = 0
    let unmatchedCount = 0
    let lastCategory = null

    for (const product of products) {
      const productCapacity = extractCapacity(product.description)
      const requiresCapacity = needsCapacityMatch(product.description)
      
      let matchedPrice = null

      for (const price of prices) {
        if (price.category !== product.category) continue
        const requiresColor = needsColorMatch(product.category, price.model)
        
        const productModel = extractModelName(product.description, !requiresColor)
        const priceModel = extractModelName(price.model, !requiresColor)
        
        if (!modelsMatch(productModel, priceModel)) continue
        
        if (requiresCapacity) {
          const priceCapacity = price.capacity || extractCapacity(price.model)
          if (priceCapacity && productCapacity && priceCapacity !== productCapacity) {
            continue
          }
        }

        matchedPrice = price
        break
      }

      if (matchedPrice !== null) {
        if (lastCategory !== null && lastCategory !== product.category) {
          results.push('')
          results.push('')
        }
        results.push(`${product.lineNum}\t${matchedPrice.price}`)
        matchedCount++
        lastCategory = product.category
      } else {
        unmatchedCount++
      }
    }

    setMatchResult(results.join('\n'))
    setStats({ matched: matchedCount, unmatched: unmatchedCount, total: products.length })
  }

  const processLockedMatching = () => {
    const prices = parsePriceList(priceList)
    const products = parseProductList(productList)
    const results = []
    let lastCategory = null

    for (const product of products) {
      const productCapacity = extractCapacity(product.description)
      const requiresCapacity = needsCapacityMatch(product.description)
      let matchedPrice = null

      for (const price of prices) {
        if (price.category !== product.category) continue
        const requiresColor = needsColorMatch(product.category, price.model)
        const productModel = extractModelName(product.description, !requiresColor)
        const priceModel = extractModelName(price.model, !requiresColor)
        
        if (!modelsMatch(productModel, priceModel)) continue
        
        if (requiresCapacity) {
          const priceCapacity = price.capacity || extractCapacity(price.model)
          if (priceCapacity && productCapacity && priceCapacity !== productCapacity) continue
        }

        matchedPrice = price
        break
      }

      if (matchedPrice !== null) {
        if (lastCategory !== null && lastCategory !== product.category) {
          results.push('')
          results.push('')
        }
        const remarks = product.remarks || ''
        const deductedPrice = applyDeductions(matchedPrice.price, remarks)
        results.push(`${product.lineNum}\t${deductedPrice}`)
        lastCategory = product.category
      }
    }
    setLockedResult(results.join('\n'))
  }

  // ==========================================
  // Effects & Handlers
  // ==========================================

  // 自動複製功能 (簡化版：不依賴 Toast 提示，確保穩定)
  useEffect(() => {
    if (matchResult && matchResult.length > 0) {
      // 延遲一點點執行，確保狀態穩定
      const timer = setTimeout(() => {
        navigator.clipboard.writeText(matchResult).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }).catch(err => console.error("Auto copy failed:", err));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [matchResult])

  useEffect(() => {
    if (priceList.trim() && productList.trim()) {
      const timer = setTimeout(() => {
        matchProducts()
        if (isLocked) processLockedMatching()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [priceList, productList, isLocked])

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') clearAll() }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const clearAll = () => {
    setPriceList('')
    setProductList('')
    setMatchResult('')
    setLockedResult('')
    setStats({ matched: 0, unmatched: 0, total: 0 })
    setIsLocked(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(matchResult)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) { alert('複製失敗') }
  }

  // ==========================================
  // UI Render
  // ==========================================

  return (
    <div className="min-h-screen bg-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-3">產品價格匹配系統</h1>
          <p className="text-lg text-gray-600">自動匹配產品列表與價格 (穩定版)</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Price List */}
          <Card className="border border-gray-300">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-medium text-gray-700">第一步：輸入價格列表</CardTitle>
                  <CardDescription className="text-sm text-gray-500">
                    支援格式：類別與標題同行 (e.g. IPAD... 容量 數量)
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => {
                    setIsLocked(!isLocked)
                    if (!isLocked && priceList.trim() && productList.trim()) {
                      setTimeout(() => processLockedMatching(), 100)
                    }
                  }}
                  variant={isLocked ? "default" : "outline"}
                  size="sm"
                  className={isLocked ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-gray-300 hover:bg-blue-50 text-blue-700'}
                >
                  {isLocked ? <><Lock className="w-4 h-4 mr-2" />有鎖</> : <><Unlock className="w-4 h-4 mr-2" />有鎖</>}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="IPAD 原封沒激活 容量 數量 人民幣&#10;IPAD PRO 13 256GB 5 9500"
                className="h-[300px] overflow-y-auto font-mono text-sm bg-white border-gray-300 resize-none"
                value={priceList}
                onChange={(e) => setPriceList(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Product List */}
          <Card className="border border-gray-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium text-gray-700">第二步：輸入產品列表</CardTitle>
              <CardDescription className="text-sm text-gray-500">支援 Tab 分隔或 Excel 複製</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="IPAD 原封沒激活&#10;12345&#9;IPAD PRO 13 256GB"
                className="h-[300px] overflow-y-auto font-mono text-sm bg-white border-gray-300 resize-none"
                value={productList}
                onChange={(e) => setProductList(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        {matchResult && (
          <Card className="border border-gray-300">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-medium text-gray-700">匹配結果</CardTitle>
                  <CardDescription className="text-sm text-gray-500">
                    匹配: {stats.matched} / 未匹配: {stats.unmatched}
                    {copied && <span className="ml-2 text-green-600 font-bold">(已自動複製)</span>}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={copyToClipboard} variant="outline" size="sm" className={copied ? 'bg-green-50 border-green-600 text-green-700' : 'border-gray-300'}>
                    {copied ? <><Check className="w-4 h-4 mr-2" />已複製</> : '複製結果'}
                  </Button>
                  <Button onClick={clearAll} variant="outline" size="sm" className="border-gray-300 hover:bg-red-50 text-red-700">
                    <Trash2 className="w-4 h-4 mr-2" />清除
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea value={matchResult} readOnly className="h-[300px] overflow-y-auto font-mono text-sm bg-white border-gray-300 resize-none" />
            </CardContent>
          </Card>
        )}

        {isLocked && lockedResult && (
          <Card className="border border-blue-300 bg-blue-50/30 mt-6">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-medium text-blue-700 flex items-center"><Lock className="w-5 h-5 mr-2" />有鎖模式扣減結果</CardTitle>
                </div>
                <Button onClick={() => navigator.clipboard.writeText(lockedResult)} variant="outline" size="sm" className="border-blue-300 hover:bg-blue-100">
                  複製扣減結果
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea value={lockedResult} readOnly className="h-[300px] overflow-y-auto font-mono text-sm bg-white border-blue-300 resize-none" />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default App
