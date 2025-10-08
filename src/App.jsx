import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Download, Upload, CheckCircle2, XCircle, Info, Check } from 'lucide-react'
import './App.css'

function App() {
  const [priceList, setPriceList] = useState('')
  const [productList, setProductList] = useState('')
  const [matchResult, setMatchResult] = useState('')
  const [stats, setStats] = useState({ matched: 0, unmatched: 0, total: 0 })
  const [copied, setCopied] = useState(false)

  // Auto-match when both inputs have content
  useEffect(() => {
    if (priceList.trim() && productList.trim()) {
      // Delay to avoid too frequent updates
      const timer = setTimeout(() => {
        matchProducts()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [priceList, productList])

  // Parse price list into structured data
  const parsePriceList = (text) => {
    const lines = text.trim().split('\n')
    const prices = []
    let currentCategory = 'DEFAULT'

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      // Skip header rows (CAP QTY HKD, etc.) - check this FIRST
      const upperLine = trimmed.toUpperCase()
      const isHeader = (upperLine.includes('CAP') || upperLine.includes('CAPACITY')) && 
          (upperLine.includes('QTY') || upperLine.includes('QUANTITY')) && 
          (upperLine.includes('HKD') || upperLine.includes('PRICE'))
      
      if (isHeader) {
        // Extract category from first column if present
        const parts = trimmed.split('\t')
        if (parts.length > 1) {
          const firstCol = parts[0].trim()
          // Check if first column looks like a category (all uppercase, not a header keyword)
          if (firstCol === firstCol.toUpperCase() && 
              !firstCol.includes('CAP') && 
              !firstCol.includes('QTY') && 
              !firstCol.includes('HKD')) {
            currentCategory = firstCol
          }
        }
        continue
      }

      // Check if it's a category line (no tabs, all uppercase, not a header)
      if (!trimmed.includes('\t') && trimmed === trimmed.toUpperCase()) {
        currentCategory = trimmed
        continue
      }

      // Parse price line
      const parts = trimmed.split('\t')
      if (parts.length >= 3) {
        const model = parts[0].trim()
        const secondCol = parts[1].trim()
        const isPartNumber = /^[A-Z0-9]{6,10}$/i.test(secondCol) && !secondCol.match(/\d+(GB|TB)$/i)
        
        let capacity = ''
        let qty = 0
        let price = 0
        
        if (isPartNumber) {
          qty = parseInt(parts[2]) || 0
          price = parseFloat(parts[3]) || 0
        } else {
          capacity = secondCol
          qty = parseInt(parts[2]) || 0
          price = parseFloat(parts[3]) || 0
        }

        prices.push({
          category: currentCategory,
          model: model,
          capacity: capacity,
          qty: qty,
          price: price
        })
      }
    }

    return prices
  }

  // Parse product list with line numbers
  const parseProductList = (text) => {
    const lines = text.trim().split('\n')
    const products = []
    let currentCategory = 'DEFAULT'

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      // Skip header rows
      const upperLine = trimmed.toUpperCase()
      if (upperLine.includes('CAP') && upperLine.includes('QTY') && upperLine.includes('HKD')) {
        continue
      }

      // Check if it's a category line
      if (!trimmed.includes('\t') && trimmed === trimmed.toUpperCase()) {
        currentCategory = trimmed
        continue
      }

      // Parse product line with line number
      const parts = trimmed.split('\t')
      
      if (parts.length >= 2) {
        const lineNum = parts[0].trim()
        let description = ''
        
        if (parts.length === 2) {
          description = parts[1].trim()
        } else if (parts.length >= 3) {
          description = parts[2].trim()
        }
        
        if (lineNum && description) {
          products.push({
            lineNum,
            description,
            category: currentCategory
          })
        }
      }
    }

    return products
  }

  // Extract capacity from product description
  const extractCapacity = (description) => {
    const capacityMatch = description.match(/\b(\d+(?:GB|TB))\b/i)
    return capacityMatch ? capacityMatch[1].toUpperCase() : ''
  }

  // Extract model name without capacity (and optionally without color)
  const extractModelName = (text, removeColor = false) => {
    let model = text.replace(/\b\d+(?:GB|TB)\b/gi, '').trim()
    
    if (removeColor) {
      const colors = ['BLACK', 'WHITE', 'BLUE', 'ORANGE', 'SILVER', 'GOLD', 'NATURAL', 'DESERT', 
                      'PINK', 'ULTRAMARINE', 'GRAY', 'GREY', 'GREEN', 'RED', 'PURPLE', 
                      'YELLOW', 'LAVENDER', 'SAGE', 'MIDNIGHT', 'STARLIGHT', 'TITANIUM',
                      'SPACE', 'ROSE', 'CORAL', 'TEAL', 'INDIGO', 'CRIMSON']
      
      for (const color of colors) {
        const regex = new RegExp(`\\b${color}\\b\\s*$`, 'i')
        model = model.replace(regex, '').trim()
      }
    }
    
    return model.toUpperCase().replace(/\s+/g, ' ')
  }

  // Check if category requires color matching
  const needsColorMatch = (category) => {
    const cat = category.toUpperCase()
    // UNLOCKED categories need color matching
    // LOCKED categories don't need color matching
    // DEFAULT category doesn't need color matching
    if (cat.includes('UNLOCKED')) return true
    if (cat.includes('LOCKED')) return false
    if (cat === 'DEFAULT') return false
    // Other categories need color matching by default
    return true
  }

  // Check if product needs capacity matching
  const needsCapacityMatch = (description) => {
    const upper = description.toUpperCase()
    return upper.includes('IPHONE') || upper.includes('IPAD')
  }

  // Check if two model names match exactly
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

  // Match products with prices
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
      const requiresColor = needsColorMatch(product.category)

      const productModel = extractModelName(product.description, !requiresColor)
      
      let matchedPrice = null

      for (const price of prices) {
        if (price.category !== product.category) continue

        const priceModel = extractModelName(price.model, !requiresColor)
        
        if (!modelsMatch(productModel, priceModel)) {
          continue
        }
        
        if (requiresCapacity) {
          if (price.capacity && productCapacity && price.capacity !== productCapacity) {
            continue
          }
        }

        matchedPrice = price
        break
      }

      if (matchedPrice !== null) {
        // Add double line break between different categories
        if (lastCategory !== null && lastCategory !== product.category) {
          results.push('')  // Empty line
          results.push('')  // Second empty line
        }
        
        results.push(`${product.lineNum}\t${matchedPrice.price}`)
        matchedCount++
        lastCategory = product.category
      } else {
        unmatchedCount++
        // Don't add unmatched lines to results
      }
    }

    setMatchResult(results.join('\n'))
    setStats({
      matched: matchedCount,
      unmatched: unmatchedCount,
      total: products.length
    })
  }

  // Copy result to clipboard with button feedback
  const copyToClipboard = () => {
    navigator.clipboard.writeText(matchResult)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Download result as text file
  const downloadResult = () => {
    const blob = new Blob([matchResult], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'price_match_result.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Clear all inputs
  const clearAll = () => {
    setPriceList('')
    setProductList('')
    setMatchResult('')
    setStats({ matched: 0, unmatched: 0, total: 0 })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-3">
            產品價格匹配系統
          </h1>
          <p className="text-lg text-gray-600">
            自動匹配產品列表與價格，快速生成報價結果
          </p>
        </div>

        {/* Info Banner */}
        <div className="mb-6 p-4 bg-gray-100 border border-gray-300 rounded-lg flex items-start gap-3">
          <Info className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <strong>匹配規則：</strong>
            <ul className="mt-1 space-y-1">
              <li>• iPhone 和 iPad 需要同時匹配型號和容量</li>
              <li>• LOCKED 類別：不需要匹配顏色（任何顏色都可以）</li>
              <li>• UNLOCKED 和其他類別：需要匹配顏色</li>
              <li>• 其他產品（MacBook, Apple Watch, AirPods 等）只需匹配型號</li>
              <li>• 系統會自動忽略 Part Number（如 MRYN3LL, MXP93LL）</li>
              <li>• 產品列表支援備注欄位（Column B 會被自動忽略）</li>
            </ul>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Price List Input */}
          <Card className="shadow-md">
            <CardHeader className="bg-gray-700 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                第一步：輸入價格列表
              </CardTitle>
              <CardDescription className="text-gray-300">
                貼上您的 PRICE LIST（格式：類別、型號、容量/Part Number、數量、價格）
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Textarea
                placeholder="UNLOCKED N/A&#10;IPHONE 15 BLACK&#9;128GB&#9;3&#9;3700"
                className="min-h-[400px] font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-gray-400 bg-white border-gray-300"
                value={priceList}
                onChange={(e) => setPriceList(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Product List Input */}
          <Card className="shadow-md">
            <CardHeader className="bg-gray-700 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                第二步：輸入產品列表
              </CardTitle>
              <CardDescription className="text-gray-300">
                貼上您的 LIST（格式：行號、產品描述，支援備注欄）
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Textarea
                placeholder="UNLOCKED N/A&#10;22&#9;IPHONE 16E 128GB BLACK&#10;23&#9;IPHONE 16E 128GB BLACK"
                className="min-h-[400px] font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-gray-400 bg-white border-gray-300"
                value={productList}
                onChange={(e) => setProductList(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        {matchResult && (
          <Card className="shadow-md">
            <CardHeader className="bg-gray-700 text-white rounded-t-lg">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    匹配結果
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    系統已完成自動匹配
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={copyToClipboard} 
                    variant="secondary" 
                    size="sm"
                    className={copied ? 'bg-green-600 text-white hover:bg-green-700' : ''}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        已複製
                      </>
                    ) : (
                      '複製結果'
                    )}
                  </Button>
                  <Button onClick={downloadResult} variant="secondary" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    下載
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Stats */}
              <div className="flex flex-wrap gap-3 mb-4">
                <Badge variant="default" className="text-sm py-2 px-4 bg-gray-700">
                  總數: {stats.total}
                </Badge>
                <Badge variant="default" className="text-sm py-2 px-4 bg-green-600">
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  已匹配: {stats.matched}
                </Badge>
                <Badge variant="destructive" className="text-sm py-2 px-4">
                  <XCircle className="w-4 h-4 mr-1" />
                  未匹配: {stats.unmatched}
                </Badge>
                {stats.matched > 0 && (
                  <Badge variant="default" className="text-sm py-2 px-4 bg-gray-600">
                    成功率: {((stats.matched / stats.total) * 100).toFixed(1)}%
                  </Badge>
                )}
              </div>

              {/* Result Text */}
              <Textarea
                value={matchResult}
                readOnly
                className="min-h-[400px] font-mono text-sm bg-gray-50"
              />
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© 2025 產品價格匹配系統 - 快速、準確、高效</p>
        </div>
      </div>
    </div>
  )
}

export default App
