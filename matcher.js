// Price Matcher - Minimal Version

let matchedResults = [];

function performMatching() {
    const summaryText = document.getElementById('summaryInput').value.trim();
    const priceText = document.getElementById('priceInput').value.trim();
    
    if (!summaryText || !priceText) return;
    
    const summaryData = parseData(summaryText);
    const priceData = parseData(priceText);
    
    matchedResults = [];
    let matchedCount = 0;
    let unmatchedCount = 0;
    
    for (const item of summaryData) {
        const matchedPrice = findMatch(item, priceData);
        
        matchedResults.push({
            model: item.model,
            storage: item.storage,
            quantity: item.quantity,
            price: matchedPrice || 'NO MATCH'
        });
        
        if (matchedPrice) matchedCount++;
        else unmatchedCount++;
    }
    
    document.getElementById('matchedRows').textContent = matchedCount;
    document.getElementById('unmatchedRows').textContent = unmatchedCount;
    
    renderResults();
}

function parseData(text) {
    return text.split('\n')
        .filter(line => line.trim())
        .map(line => {
            // 自動偵測分隔符：Tab 或多個空格
            let parts;
            if (line.includes('\t')) {
                // 有 Tab → 用 Tab 分隔
                parts = line.split('\t').map(p => p.trim());
            } else {
                // 沒 Tab → 用空格分隔（取最後 3 欄為 storage/quantity/price）
                const tokens = line.trim().split(/\s+/);
                if (tokens.length >= 3) {
                    const price = tokens[tokens.length - 1];
                    const quantity = tokens[tokens.length - 2];
                    const storage = tokens[tokens.length - 3];
                    const model = tokens.slice(0, tokens.length - 3).join(' ');
                    parts = [model, storage, quantity, price];
                } else {
                    parts = tokens;
                }
            }
            
            return {
                model: parts[0] || '',
                storage: parts[1] || '',
                quantity: parts[2] || '1',
                price: parts[3] || parts[2] || ''
            };
        });
}

function findMatch(item, priceData) {
    const { model, storage } = item;
    const isLocked = model.toUpperCase().includes('LOCKED');
    const hasColor = /\s(ORANGE|SILVER|BLUE|BLACK|WHITE|PINK|PURPLE|GREEN|YELLOW|RED|GOLD|ROSE|TITANIUM|GRAPHITE|MIDNIGHT|STARLIGHT|PRODUCT RED|橙色|白色|藍色|黑色|粉色|紫色|綠色|黃色|紅色|金色|玫瑰金|鈦色|石墨色|午夜色|星光色)\s*$/i.test(model);
    
    // 🔥 新邏輯：LOCKED 17 Pro / 17 Pro Max → 必須匹配顏色
    const is17Pro = model.toUpperCase().includes('17 PRO');
    
    if (isLocked && is17Pro && hasColor) {
        // LOCKED 17 Pro/Pro Max + 有顏色 → 完全匹配（包括顏色）
        const match = priceData.find(p => 
            normalize(p.model) === normalize(model) &&
            normalize(p.storage) === normalize(storage)
        );
        return match?.price;
    }
    
    if (isLocked && !is17Pro) {
        // 其他 LOCKED（非 17 Pro/Pro Max）→ 忽略顏色
        const modelNoColor = removeColor(model);
        const match = priceData.find(p => {
            const priceModelNoColor = removeColor(p.model);
            return normalize(priceModelNoColor) === normalize(modelNoColor) &&
                   normalize(p.storage) === normalize(storage);
        });
        return match?.price;
    }
    
    // 非 LOCKED → 忽略顏色
    const modelNoColor = removeColor(model);
    const match = priceData.find(p => {
        const priceModelNoColor = removeColor(p.model);
        return normalize(priceModelNoColor) === normalize(modelNoColor) &&
               normalize(p.storage) === normalize(storage);
    });
    return match?.price;
}

function removeColor(text) {
    return text.replace(/\s(ORANGE|SILVER|BLUE|BLACK|WHITE|PINK|PURPLE|GREEN|YELLOW|RED|GOLD|ROSE|TITANIUM|GRAPHITE|MIDNIGHT|STARLIGHT|PRODUCT RED|橙色|白色|藍色|黑色|粉色|紫色|綠色|黃色|紅色|金色|玫瑰金|鈦色|石墨色|午夜色|星光色)\s*$/i, '').trim();
}

function normalize(text) {
    // 顏色翻譯：中文 → 英文
    const colorMap = {
        '橙色': 'ORANGE',
        '白色': 'SILVER',
        '藍色': 'BLUE',
        '黑色': 'BLACK',
        '粉色': 'PINK',
        '紫色': 'PURPLE',
        '綠色': 'GREEN',
        '黃色': 'YELLOW',
        '紅色': 'RED',
        '金色': 'GOLD',
        '玫瑰金': 'ROSE GOLD',
        '鈦色': 'TITANIUM',
        '石墨色': 'GRAPHITE',
        '午夜色': 'MIDNIGHT',
        '星光色': 'STARLIGHT'
    };
    
    let normalized = text.toUpperCase().replace(/\s+/g, ' ').trim();
    
    // 替換中文顏色為英文
    for (const [cn, en] of Object.entries(colorMap)) {
        normalized = normalized.replace(new RegExp(cn, 'g'), en);
    }
    
    return normalized;
}

function renderResults() {
    const output = matchedResults
        .map(r => `${r.model}\t${r.storage}\t${r.quantity}\t${r.price}`)
        .join('\n');
    
    document.getElementById('resultsOutput').value = output;
}

function copyResults() {
    const output = document.getElementById('resultsOutput').value;
    if (!output) return;
    
    navigator.clipboard.writeText(output).then(() => {
        const btn = event.target;
        const original = btn.textContent;
        btn.textContent = 'Copied';
        setTimeout(() => btn.textContent = original, 1000);
    });
}

function resetAll() {
    document.getElementById('summaryInput').value = '';
    document.getElementById('priceInput').value = '';
    document.getElementById('resultsOutput').value = '';
    document.getElementById('matchedRows').textContent = '0';
    document.getElementById('unmatchedRows').textContent = '0';
    matchedResults = [];
}
