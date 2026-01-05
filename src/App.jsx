import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Check, Trash2, Lock, Unlock, X, Copy } from 'lucide-react'
import './App.css'

function App() {
  const [priceList, setPriceList] = useState('')
  const [productList, setProductList] = useState('')
  const [matchResult, setMatchResult] = useState('')
  const [stats, setStats] = useState({ matched: 0, unmatched: 0, total: 0 })
  const [copied, setCopied] = useState(false)
  
  // 新增：控制彈出視窗顯示
  const [showModal, setShowModal] = useState(false)
  
  const [isLocked, setIsLocked] = useState(false)
  const [lockedResult, setLockedResult] = useState('')

  // ==========================================
  // 核心解析邏輯 (保持不變)
  // ==========================================

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
        if (potentialCategory.length > 0) currentCategory = potentialCategory
        continue
      }

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

      const parts = trimmed.split(/\s+/)
      if (parts.length >= 3) {
        let price = 0
        let qty = 0
        let capacity = ''
        let modelParts = []

        if (!isNaN(parseFloat(parts[parts.length - 1]))) price = parseFloat(parts[parts.length - 1])
        if (parts.length >= 2 && !isNaN(parseInt(parts[parts.length - 2]))) qty = parseInt(parts[parts.length - 2])

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
            prices.push({ category: currentCategory, model: model, capacity: capacity, qty: qty, price: price })
        }
      }
    }
    return prices
  }

  // ==========================================
  // 輔助功能函數 (保持不變)
  // ==========================================

  const parseProductList = (text) => {
    const lines = text.trim().split('\n')
    const products = []
    let currentCategory = 'DEFAULT'

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      const upperLine = trimmed.toUpperCase()
      if (upperLine.includes('CAP') && upperLine.includes('QTY') && upperLine.includes('HKD')) continue

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
        if (parts.length === 2) description = parts[1].trim()
        else if (parts.length >= 3) {
          remarks = parts[1].trim()
          description = parts[2].trim()
        }
        if (lineNum && description) products.push({ lineNum, remarks, description, category: currentCategory })
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
    if (cat.includes('LOCKED')) return cat.includes('N/A') || cat.includes('ACT')
    if (cat === 'DEFAULT') return false
    return true
  }

  const needsCapacityMatch = (description) => /\b\d+(?:GB|TB)\b/i.test(description)

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
    finalPrice -= 15
    const deductions = {
      '小花': -100, '花機': -150, '大花': -350, '舊機': -350,
      '低保': -100, '過保': -200, '黑機': -200, '配置鎖': -300
    }
    for (const [keyword, amount] of Object.entries(deductions)) {
      if (remarks.includes(keyword)) finalPrice += amount
    }
    return finalPrice
  }

  // ==========================================
  // 主匹配邏輯
  // ==========================================

  const matchProducts = () => {
    const prices = parsePriceList(priceList)
    const products = parseProductList(productList)
    
    // 如果沒有產品數據，不執行匹配，也不彈出
    if (products.length === 0) {
        setMatchResult('')
        return
    }

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
        results.push(`${product.lineNum}\t${matchedPrice.price}`)
        matchedCount++
        lastCategory = product.category
      } else {
        unmatchedCount++
      }
    }

    const finalString = results.join('\n')
    
    // 只有當結果發生變化，且結果不為空時，才更新狀態並彈窗
    if (finalString !== matchResult) {
        setMatchResult(finalString)
        setStats({ matched: matchedCount, unmatched: unmatchedCount, total: products.length })
        
        // 只有在有結果時才彈出，避免清空時也彈
        if (finalString.trim().length > 0) {
            setShowModal(true)
        }
    }
  }

  const processLockedMatching = () => {
    // (保留原本邏輯，但為了簡潔省略重複代碼，如有需要可放回)
    // 這裡為了主要功能演示，假設 lockedResult 邏輯同上，若有鎖模式開啟也會計算
    const prices = parsePriceList(priceList)
    const products = parseProductList(productList)
    const results = []
    let lastCategory = null

    for (const product of products) {
        // ... (同上文的匹配邏輯，加上扣減) ...
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
                results.push(''); results.push('');
            }
            const deductedPrice = applyDeductions(matchedPrice.price, product.remarks || '')
            results.push(`${product.lineNum}\t${deductedPrice}`)
            lastCategory = product.category
        }
    }
    setLockedResult(results.join('\n'))
  }

  // ==========================================
  // Effects & Handlers
  // ==========================================

  // 自動複製功能：監聽 showModal 和 matchResult
  // 當 Modal 打開且有結果時，自動執行複製
  useEffect(() => {
    if (showModal && matchResult && matchResult.length > 0) {
      const timer = setTimeout(() => {
        navigator.clipboard.writeText(matchResult).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }).catch(err => console.error("Auto copy failed:", err));
      }, 300); // 稍微延遲確保 Modal 渲染完成
      return () => clearTimeout(timer);
    }
  }, [showModal, matchResult])

  // 輸入變更後的去抖動 (Debounce) 處理
  useEffect(() => {
    if (priceList.trim() && productList.trim()) {
      const timer = setTimeout(() => {
        matchProducts()
        if (isLocked) processLockedMatching()
      }, 800) // 延長一點時間，避免用戶還在打字就一直彈窗
      return () => clearTimeout(timer)
    }
  }, [priceList, productList, isLocked])

  useEffect(() => {
    const handleKeyDown = (e) => { 
        if (e.key === 'Escape') {
            setShowModal(false) // 按 ESC 關閉 Modal
        }
    }
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
    setShowModal(false)
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) { alert('複製失敗') }
  }

  // ==========================================
  // UI Render
  // ==========================================

  return (
    <div className="min-h-screen bg-white p-4 md:p-6 relative">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-3">產品價格匹配系統</h1>
          <p className="text-lg text-gray-600">Step 1: 價格表 → Step 2: 產品表 → Step 3: 自動彈出結果</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Price List */}
          <Card className="border border-gray-300 shadow-sm">
            <CardHeader className="pb-3 bg-gray-50/50">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-medium text-gray-700">Step 1: 輸入價格列表</CardTitle>
                  <CardDescription className="text-sm text-gray-500">
                    支援格式：類別與標題同行 (e.g. IPAD... 容量 數量)
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => setIsLocked(!isLocked)}
                  variant={isLocked ? "default" : "outline"}
                  size="sm"
                  className={isLocked ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-gray-300 hover:bg-blue-50 text-blue-700'}
                >
                  {isLocked ? <><Lock className="w-4 h-4 mr-2" />有鎖模式</> : <><Unlock className="w-4 h-4 mr-2" />普通模式</>}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <Textarea
                placeholder="IPAD 原封沒激活 容量 數量 人民幣&#10;IPAD PRO 13 256GB 5 9500"
                className="h-[300px] overflow-y-auto font-mono text-sm bg-white border-gray-300 resize-none focus:ring-2 focus:ring-blue-500"
                value={priceList}
                onChange={(e) => setPriceList(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Product List */}
          <Card className="border border-gray-300 shadow-sm">
            <CardHeader className="pb-3 bg-gray-50/50">
              <CardTitle className="text-lg font-medium text-gray-700">Step 2: 輸入產品列表</CardTitle>
              <CardDescription className="text-sm text-gray-500">粘貼後稍等片刻，結果將自動彈出</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Textarea
                placeholder="IPAD 原封沒激活&#10;12345&#9;IPAD PRO 13 256GB"
                className="h-[300px] overflow-y-auto font-mono text-sm bg-white border-gray-300 resize-none focus:ring-2 focus:ring-blue-500"
                value={productList}
                onChange={(e) => setProductList(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>

        {/* 底部按鈕區 */}
        <div className="flex justify-center gap-4">
            <Button onClick={clearAll} variant="destructive" className="w-40">
                <Trash2 className="w-4 h-4 mr-2" /> 全部清除
            </Button>
            {matchResult && !showModal && (
                <Button onClick={() => setShowModal(true)} variant="outline" className="w-40 border-blue-500 text-blue-600 hover:bg-blue-50">
                    <Copy className="w-4 h-4 mr-2" /> 顯示上次結果
                </Button>
            )}
        </div>
      </div>

      {/* ==========================================
          Step 3: 彈出式結果 (Custom Modal)
          ========================================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl border border-gray-200 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <Check className="w-6 h-6 text-green-500 mr-2" />
                        匹配完成
                    </h2>
                    <p className="text-sm text-gray-500">
                        匹配: {stats.matched} / 未匹配: {stats.unmatched}
                        {copied ? 
                            <span className="ml-2 text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded animate-pulse">✓ 已自動複製</span> : 
                            <span className="ml-2 text-gray-400">(結果已複製到剪貼板)</span>
                        }
                    </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowModal(false)} className="rounded-full hover:bg-gray-100">
                    <X className="w-5 h-5 text-gray-500" />
                </Button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto flex-1 bg-gray-50/50">
                <label className="block text-sm font-medium text-gray-700 mb-2">匹配結果 (可直接貼上 Excel)</label>
                <Textarea 
                    value={matchResult} 
                    readOnly 
                    onClick={(e) => e.target.select()}
                    className="h-[300px] font-mono text-sm bg-white border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none shadow-inner" 
                />
                
                {/* 如果開啟了有鎖模式，顯示額外的框 */}
                {isLocked && lockedResult && (
                    <div className="mt-4">
                        <div className="flex justify-between items-center mb-2">
                             <label className="block text-sm font-medium text-blue-700">🔒 有鎖模式扣減結果</label>
                             <Button onClick={() => copyToClipboard(lockedResult)} size="sm" variant="ghost" className="h-6 text-xs text-blue-600 hover:bg-blue-50">
                                複製此項
                             </Button>
                        </div>
                        <Textarea 
                            value={lockedResult} 
                            readOnly 
                            className="h-[150px] font-mono text-sm bg-blue-50/30 border-blue-200 resize-none" 
                        />
                    </div>
                )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-white rounded-b-xl">
                <Button variant="outline" onClick={() => setShowModal(false)}>
                    關閉並繼續輸入
                </Button>
                <Button 
                    onClick={() => copyToClipboard(matchResult)} 
                    className={`${copied ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white min-w-[140px] transition-all`}
                >
                    {copied ? <><Check className="w-4 h-4 mr-2" /> 已複製</> : <><Copy className="w-4 h-4 mr-2" /> 再次複製</>}
                </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
