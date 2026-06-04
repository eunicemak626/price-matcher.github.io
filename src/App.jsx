// BUILD: 2026-04-28 v3 — Chinese-color match + auto-copy + ESC clear
console.log('App.jsx loaded - BUILD 2026-04-28 v3');
import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Check, Trash2, Lock, Unlock } from 'lucide-react'
import './App.css'

// ============================================================
// 中→英顏色翻譯
// ============================================================
const COLOR_MAP_CN_TO_EN = {
  '橙色': 'ORANGE',
  '白色': 'SILVER',     // iPhone Pro 系列：白色 = SILVER
  '銀色': 'SILVER',
  '藍色': 'BLUE',
  '黑色': 'BLACK',
  '粉色': 'PINK',
  '粉紅色': 'PINK',
  '紫色': 'PURPLE',
  '綠色': 'GREEN',
  '黃色': 'YELLOW',
  '紅色': 'RED',
  '金色': 'GOLD',
  '玫瑰金': 'ROSE GOLD',
  '鈦色': 'TITANIUM',
  '原色鈦金屬': 'NATURAL TITANIUM',
  '鈦原色': 'NATURAL',
  '自然色': 'NATURAL',
  '沙漠色': 'DESERT',
  '石墨色': 'GRAPHITE',
  '午夜色': 'MIDNIGHT',
  '星光色': 'STARLIGHT',
  '茶色': 'TEAL',
  '青色': 'TEAL',
  '薰衣草': 'LAVENDER',
  '薰衣草色': 'LAVENDER',
}

// 英文顏色 alias（白色 ≡ SILVER 已 map 上面，呢度處理英文輸入嘅 WHITE → SILVER）
const ENGLISH_COLOR_ALIAS = {
  'WHITE': 'SILVER',
}

const ALL_COLORS_EN = ['BLACK','WHITE','BLUE','ORANGE','SILVER','GOLD','NATURAL','DESERT','PINK','ULTRAMARINE','GRAY','GREY','GREEN','RED','PURPLE','YELLOW','LAVENDER','SAGE','MIDNIGHT','STARLIGHT','TITANIUM','SPACE','ROSE','CORAL','TEAL','INDIGO','CRIMSON']

function translateColors(text) {
  let out = text
  for (const [cn, en] of Object.entries(COLOR_MAP_CN_TO_EN)) {
    out = out.replace(new RegExp(cn, 'g'), en)
  }
  for (const [from, to] of Object.entries(ENGLISH_COLOR_ALIAS)) {
    out = out.replace(new RegExp(`\\b${from}\\b`, 'gi'), to)
  }
  return out
}

function App() {
  const [_buildVersion] = useState('v2026.04.28.3')
  if (typeof window !== 'undefined') {
    window.__PRICE_MATCHER_BUILD__ = '2026-04-28T00:00:00+08:00'
  }

  const [priceList, setPriceList] = useState('')
  const [productList, setProductList] = useState('')
  const [matchResult, setMatchResult] = useState('')
  const [stats, setStats] = useState({ matched: 0, unmatched: 0, total: 0 })
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [lockedResult, setLockedResult] = useState('')
  const [autoCopy, setAutoCopy] = useState(true)   // 預設開啟自動複製

  // ------------------------------------------------------------
  // 清除全部
  // ------------------------------------------------------------
  const clearAll = useCallback(() => {
    console.log('🚀 [v3] 清除全部')
    setPriceList('')
    setProductList('')
    setMatchResult('')
    setLockedResult('')
    setStats({ matched: 0, unmatched: 0, total: 0 })
    setIsLocked(false)
    setCopied(false)
    setCopyError(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  }, [])

  // ------------------------------------------------------------
  // 全域 ESC 監聽（capture phase，IME safe）
  // ------------------------------------------------------------
  useEffect(() => {
    const onKey = (e) => {
      // IME 中文輸入緊（composition），唔好觸發
      if (e.isComposing || e.keyCode === 229) return
      if (e.key === 'Escape') {
        console.log('⚡️ [v3] ESC 清除')
        e.preventDefault()
        e.stopPropagation()
        clearAll()
      }
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [clearAll])

  // ============================================================
  // 解析 / 匹配邏輯
  // ============================================================

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

  const extractCapacity = (description) => {
    const m = description.match(/\b(\d+(?:GB|TB))\b/i)
    return m ? m[1].toUpperCase() : ''
  }

  // 抽 model name（已翻譯顏色 + 可選擇移除尾巴顏色）
  const extractModelName = (text, removeColor = false) => {
    let model = translateColors(text)
    model = model.replace(/\b\d+(?:GB|TB)\b/gi, '').trim()
    if (removeColor) {
      for (const color of ALL_COLORS_EN) {
        const regex = new RegExp(`\\b${color}\\b\\s*$`, 'i')
        model = model.replace(regex, '').trim()
      }
    }
    return model.toUpperCase().replace(/\s+/g, ' ')
  }

  // 該 price 行 model 是否有 colour 喺尾
  const priceModelHasColor = (modelText) => {
    const t = translateColors(modelText).toUpperCase()
    for (const color of ALL_COLORS_EN) {
      if (new RegExp(`\\b${color}\\b\\s*$`, 'i').test(t)) return true
    }
    return false
  }

  const needsCapacityMatch = (description) => {
    const u = description.toUpperCase()
    return u.includes('IPHONE') || u.includes('IPAD') || u.includes('MACBOOK')
  }

  const modelsMatch = (productModel, priceModel) => {
    const p = productModel.toUpperCase().trim()
    const pr = priceModel.toUpperCase().trim()
    if (p === pr) return true
    const pW = p.split(/\s+/).filter(w => w)
    const prW = pr.split(/\s+/).filter(w => w)
    if (pW.length !== prW.length) return false
    for (let i = 0; i < pW.length; i++) if (pW[i] !== prW[i]) return false
    return true
  }

  // ------------------------------------------------------------
  // PRICE LIST parser
  //   • 偵測 Tab → 用 Tab；否則用「2 個或以上空格」
  //   • model 可以包含 single space（保留 "IPHONE 17 PRO MAX 橙色"）
  // ------------------------------------------------------------
  const parsePriceList = (text) => {
    const lines = text.trim().split('\n')
    const prices = []
    let currentCategory = 'DEFAULT'
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      const upper = trimmed.toUpperCase()
      const isHeader = (
        (upper.includes('CAP') || upper.includes('CAPACITY') || upper.includes('容量')) &&
        (upper.includes('QTY') || upper.includes('QUANTITY') || upper.includes('數量')) &&
        (upper.includes('HKD') || upper.includes('USD') || upper.includes('CNY') ||
         upper.includes('RMB') || upper.includes('PRICE') || upper.includes('人民幣'))
      )
      if (isHeader) continue

      const chineseCategories = ['IPAD 原封沒激活', 'IPAD 激活全套有鎖']
      if (chineseCategories.includes(trimmed)) { currentCategory = trimmed; continue }

      // 自動偵測分隔符
      let parts
      if (trimmed.includes('\t')) {
        parts = trimmed.split('\t').map(p => p.trim()).filter(p => p)
      } else {
        parts = trimmed.split(/\s{2,}/).map(p => p.trim()).filter(p => p)
      }

      // 只有 1 欄 → 視為 category label
      if (parts.length < 2) {
        currentCategory = trimmed.toUpperCase()
        continue
      }

      if (parts.length >= 3) {
        const model = parts[0].trim()
        const secondCol = parts[1].trim()
        const isPartNumber =
          /^[A-Z0-9]{6,15}$/i.test(secondCol) &&
          !secondCol.match(/\d+(GB|TB)$/i)
        let capacity = '', qty = 0, price = 0
        if (isPartNumber) {
          qty = parseInt(parts[2]) || 0
          price = parseFloat(parts[3]) || 0
        } else {
          capacity = secondCol
          qty = parseInt(parts[2]) || 0
          price = parseFloat(parts[3]) || 0
        }
        prices.push({ category: currentCategory, model, capacity, qty, price })
      }
    }
    return prices
  }

  // ------------------------------------------------------------
  // PRODUCT LIST parser
  //   • 同樣自動偵測 Tab / 多重空格
  //   • 格式：lineNum [\t remarks] \t description
  // ------------------------------------------------------------
  const parseProductList = (text) => {
    const lines = text.trim().split('\n')
    const products = []
    let currentCategory = 'DEFAULT'
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      const upper = trimmed.toUpperCase()
      if (upper.includes('CAP') && upper.includes('QTY') && upper.includes('HKD')) continue
      const chineseCategories = ['IPAD 原封沒激活', 'IPAD 激活全套有鎖']
      if ((!trimmed.includes('\t') && !/\s{2,}/.test(trimmed) && trimmed === trimmed.toUpperCase()) ||
          chineseCategories.includes(trimmed)) {
        currentCategory = trimmed
        continue
      }
      let parts
      if (trimmed.includes('\t')) {
        parts = trimmed.split('\t').map(p => p.trim())
      } else {
        parts = trimmed.split(/\s{2,}/).map(p => p.trim())
      }
      if (parts.length >= 2) {
        const lineNum = parts[0].trim()
        let remarks = '', description = ''
        if (parts.length === 2) description = parts[1].trim()
        else if (parts.length >= 3) { remarks = parts[1].trim(); description = parts[2].trim() }
        if (lineNum && description) products.push({ lineNum, remarks, description, category: currentCategory })
      }
    }
    return products
  }

  // ------------------------------------------------------------
  // 主 match：per-price-row 顏色判斷
  //   • price 行有顏色 → 必須 match 顏色
  //   • price 行冇顏色 → 忽略顏色
  // ------------------------------------------------------------
  const matchProducts = () => {
    const prices = parsePriceList(priceList)
    const products = parseProductList(productList)
    const results = []
    let matchedCount = 0, unmatchedCount = 0, lastCategory = null
    for (const product of products) {
      const productCapacity = extractCapacity(product.description)
      const requiresCap = needsCapacityMatch(product.description)
      let matchedPrice = null
      for (const price of prices) {
        if (price.category !== product.category) continue
        const requiresColor = priceModelHasColor(price.model)
        const productModel = extractModelName(product.description, !requiresColor)
        const priceModel = extractModelName(price.model, !requiresColor)
        if (!modelsMatch(productModel, priceModel)) continue
        if (requiresCap) {
          const priceCap = price.capacity || extractCapacity(price.model)
          if (priceCap && productCapacity && priceCap !== productCapacity) continue
        }
        matchedPrice = price
        break
      }
      if (matchedPrice !== null) {
        if (lastCategory !== null && lastCategory !== product.category) { results.push(''); results.push('') }
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
      const requiresCap = needsCapacityMatch(product.description)
      let matchedPrice = null
      for (const price of prices) {
        if (price.category !== product.category) continue
        const requiresColor = priceModelHasColor(price.model)
        const productModel = extractModelName(product.description, !requiresColor)
        const priceModel = extractModelName(price.model, !requiresColor)
        if (!modelsMatch(productModel, priceModel)) continue
        if (requiresCap) {
          const priceCap = price.capacity || extractCapacity(price.model)
          if (priceCap && productCapacity && priceCap !== productCapacity) continue
        }
        matchedPrice = price
        break
      }
      if (matchedPrice !== null) {
        if (lastCategory !== null && lastCategory !== product.category) { results.push(''); results.push('') }
        const remarks = product.remarks || ''
        const deductedPrice = applyDeductions(matchedPrice.price, remarks)
        results.push(`${product.lineNum}\t${deductedPrice}`)
        lastCategory = product.category
      }
    }
    setLockedResult(results.join('\n'))
  }

  // 自動匹配（debounce 500ms）
  useEffect(() => {
    if (priceList.trim() && productList.trim()) {
      const timer = setTimeout(() => {
        matchProducts()
        if (isLocked) processLockedMatching()
      }, 500)
      return () => clearTimeout(timer)
    } else {
      setMatchResult('')
      setLockedResult('')
      setStats({ matched: 0, unmatched: 0, total: 0 })
    }
  }, [priceList, productList, isLocked])

  // ============================================================
  // 可靠複製：Clipboard API → execCommand fallback
  // ============================================================
  const writeTextReliably = useCallback(async (text) => {
    if (!text) return false
    if (typeof window !== 'undefined' && typeof window.focus === 'function') {
      try { window.focus() } catch (_) {}
    }
    if (navigator.clipboard && navigator.clipboard.writeText && document.hasFocus()) {
      try {
        await navigator.clipboard.writeText(text)
        return true
      } catch (err) {
        console.warn('Clipboard API failed, fallback to execCommand:', err)
      }
    }
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.left = '-999999px'
      ta.style.top = '-999999px'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch (err) {
      console.error('execCommand copy failed:', err)
      return false
    }
  }, [])

  // 自動複製：matchResult 一更新即複製（如果 user 開咗）
  // 用 ref 防止無限 loop
  const lastAutoCopiedRef = useRef('')
  useEffect(() => {
    if (!autoCopy) return
    if (!matchResult) return
    if (matchResult === lastAutoCopiedRef.current) return
    lastAutoCopiedRef.current = matchResult
    ;(async () => {
      const ok = await writeTextReliably(matchResult)
      if (ok) {
        setCopied(true)
        setCopyError(false)
        setTimeout(() => setCopied(false), 1500)
      }
    })()
  }, [matchResult, autoCopy, writeTextReliably])

  const copyToClipboard = async () => {
    const ok = await writeTextReliably(matchResult)
    if (ok) {
      setCopied(true)
      setCopyError(false)
      setTimeout(() => setCopied(false), 2000)
    } else {
      setCopyError(true)
      setCopied(false)
      alert('複製失敗，請手動選取結果再 Ctrl+C / Cmd+C')
    }
  }

  return (
    <div className="min-h-screen bg-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-3">產品價格匹配系統</h1>
          <p className="text-lg text-gray-600">自動匹配產品列表與價格，快速生成報價結果</p>
          <p className="text-xs text-gray-400 mt-1">v2026.04.28.3 · 按 ESC 清除 · 結果自動複製</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="border border-gray-300">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-medium text-gray-700">第一步：輸入價格列表</CardTitle>
                  <CardDescription className="text-sm text-gray-500">貼上您的 PRICE LIST（格式：類別、型號、容量/Part Number、數量、價格）</CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setIsLocked(!isLocked)
                    if (!isLocked && priceList.trim() && productList.trim()) {
                      setTimeout(() => processLockedMatching(), 100)
                    }
                  }}
                  variant={isLocked ? 'default' : 'outline'}
                  size="sm"
                  className={isLocked ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-gray-300 hover:bg-blue-50 hover:text-blue-700'}
                >
                  {isLocked ? <><Lock className="w-4 h-4 mr-2" />有鎖</> : <><Unlock className="w-4 h-4 mr-2" />有鎖</>}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="貼上你嘅 invoice data&#10;IPHONE 15 BLACK&#9;128GB&#9;3&#9;3700"
                className="h-[300px] overflow-y-auto font-mono text-sm bg-white border-gray-300 resize-none"
                value={priceList}
                onChange={(e) => setPriceList(e.target.value)}
              />
            </CardContent>
          </Card>

          <Card className="border border-gray-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium text-gray-700">第二步：輸入產品列表</CardTitle>
              <CardDescription className="text-sm text-gray-500">貼上您的 LIST（格式：行號、產品描述，支援備注欄）</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="22&#9;IPHONE 16E 128GB BLACK"
                className="h-[300px] overflow-y-auto font-mono text-sm bg-white border-gray-300 resize-none"
                value={productList}
                onChange={(e) => setProductList(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>

        {matchResult && (
          <Card className="border border-gray-300">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-medium text-gray-700">匹配結果</CardTitle>
                  <CardDescription className="text-sm text-gray-500">
                    已匹配 {stats.matched} / {stats.total}
                    {stats.unmatched > 0 && `（未匹配 ${stats.unmatched}）`}
                    　·　點擊結果框即可全選並複製
                  </CardDescription>
                </div>
                <div className="flex gap-2 items-center">
                  <label className="flex items-center gap-1 text-sm text-gray-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoCopy}
                      onChange={(e) => setAutoCopy(e.target.checked)}
                    />
                    自動複製
                  </label>
                  <Button onClick={copyToClipboard} variant="outline" size="sm" className={copied ? 'bg-green-50 border-green-600 text-green-700' : copyError ? 'bg-red-50 border-red-600 text-red-700' : 'border-gray-300'}>
                    {copied ? <><Check className="w-4 h-4 mr-2" />已複製</> : copyError ? '請手動複製' : '複製結果'}
                  </Button>
                  <Button onClick={clearAll} variant="outline" size="sm" className="border-gray-300 hover:bg-red-50 hover:text-red-700">
                    <Trash2 className="w-4 h-4 mr-2" />清除
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={matchResult}
                readOnly
                className="h-[300px] overflow-y-auto font-mono text-sm bg-white border-gray-300 resize-none cursor-pointer"
                onClick={async (e) => {
                  e.target.select()
                  const ok = await writeTextReliably(matchResult)
                  if (ok) {
                    setCopied(true)
                    setCopyError(false)
                    setTimeout(() => setCopied(false), 2000)
                  } else {
                    setCopyError(true)
                    setCopied(false)
                    setTimeout(() => setCopyError(false), 3000)
                  }
                }}
              />
            </CardContent>
          </Card>
        )}

        {isLocked && lockedResult && (
          <Card className="border border-blue-300 bg-blue-50/30 mt-6">
            <CardHeader className="pb-3">
              <div className="flex justify-between">
                <CardTitle className="text-lg font-medium text-blue-700 flex items-center"><Lock className="w-5 h-5 mr-2" />有鎖模式扣減結果</CardTitle>
                <Button
                  onClick={() => writeTextReliably(lockedResult)}
                  variant="outline"
                  size="sm"
                  className="border-blue-300 hover:bg-blue-100"
                >
                  複製扣減結果
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea value={lockedResult} readOnly className="h-[300px] overflow-y-auto font-mono text-sm bg-white border-blue-300 resize-none" />
            </CardContent>
          </Card>
        )}

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© 2025 產品價格匹配系統 - 快速、準確、高效</p>
        </div>
      </div>
    </div>
  )
}

export default App
