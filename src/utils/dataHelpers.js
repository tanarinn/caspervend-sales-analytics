/**
 * データ集計・変換ヘルパー関数群
 */

/**
 * 売上合計をフォーマット（L$表記）
 * @param {number} val
 * @returns {string}
 */
export function fmtLS(val) {
    if (val == null || isNaN(val)) return 'L$ 0'
    return `L$ ${Math.round(val).toLocaleString('ja-JP')}`
}

/**
 * 数値を3桁カンマ区切りで表示
 */
export function fmtNum(val) {
    if (val == null || isNaN(val)) return '0'
    return Math.round(val).toLocaleString('ja-JP')
}

/**
 * パーセント表示（小数点第1位）
 */
export function fmtPct(val) {
    if (val == null || isNaN(val) || !isFinite(val)) return '—'
    return `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`
}

/**
 * グローバルフィルターを適用してトランザクションを絞り込む
 * @param {Array} rows - 全トランザクション
 * @param {Object} filters - フィルター設定
 * @param {string} filters.yearStart
 * @param {string} filters.yearEnd
 * @param {string} filters.channel - 'all' | 'SL Marketplace' | 'CasperVend v2'
 * @param {boolean} filters.excludeDemo - DEMOを除外するか
 * @returns {Array}
 */
export function applyFilters(rows, filters) {
    const { yearStart, yearEnd, channel, excludeDemo } = filters
    return rows.filter((r) => {
        if (!r.isComplete) return false
        if (r.year === null) return false
        if (yearStart && r.year < parseInt(yearStart)) return false
        if (yearEnd && r.year > parseInt(yearEnd)) return false
        if (channel && channel !== 'all') {
            if (channel === 'SL Marketplace' && r.location !== 'SL Marketplace') return false
            if (channel === '__in_world__' && r.location === 'SL Marketplace') return false
        }
        if (excludeDemo && r.isDemo) return false
        return true
    })
}

/**
 * 年別売上集計
 * @param {Array} rows - フィルター済みトランザクション
 * @returns {Array<{year, gross, count, avgPrice, growthRate}>}
 */
export function aggregateByYear(rows) {
    const map = {}
    for (const r of rows) {
        if (!r.isPaid) continue
        const y = r.year
        if (!map[y]) map[y] = { year: y, gross: 0, count: 0 }
        map[y].gross += r.gross
        map[y].count += 1
    }
    const sorted = Object.values(map).sort((a, b) => a.year - b.year)
    return sorted.map((d, i) => ({
        ...d,
        avgPrice: d.count > 0 ? d.gross / d.count : 0,
        growthRate: i === 0 ? null : ((d.gross - sorted[i - 1].gross) / sorted[i - 1].gross) * 100,
    }))
}

/**
 * CAGR（年平均成長率）計算
 * @param {Array} yearData - aggregateByYear の結果
 * @returns {number|null}
 */
export function calcCAGR(yearData) {
    if (yearData.length < 2) return null
    const first = yearData[0].gross
    const last = yearData[yearData.length - 1].gross
    const n = yearData.length - 1
    if (first <= 0) return null
    return (Math.pow(last / first, 1 / n) - 1) * 100
}

/**
 * 月別売上集計
 * @param {Array} rows
 * @returns {Array<{yearMonth, year, month, gross, count, prev, growthRate}>}
 */
export function aggregateByMonth(rows) {
    const map = {}
    for (const r of rows) {
        if (!r.isPaid) continue
        const ym = r.yearMonth
        if (!map[ym]) map[ym] = { yearMonth: ym, year: r.year, month: r.month, gross: 0, count: 0 }
        map[ym].gross += r.gross
        map[ym].count += 1
    }
    const sorted = Object.values(map).sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
    return sorted.map((d, i) => ({
        ...d,
        growthRate: i === 0 ? null : d.gross > 0 && sorted[i - 1].gross > 0
            ? ((d.gross - sorted[i - 1].gross) / sorted[i - 1].gross) * 100
            : null,
    }))
}

/**
 * 商品別売上集計
 * @param {Array} rows
 * @returns {Array<{productName, gross, count, avgPrice, marketplaceGross, casperGross}>}
 */
export function aggregateByProduct(rows) {
    const map = {}
    for (const r of rows) {
        if (!r.isPaid) continue
        const name = r.productName
        if (!map[name]) {
            map[name] = { productName: name, gross: 0, count: 0, marketplaceGross: 0, casperGross: 0 }
        }
        map[name].gross += r.gross
        map[name].count += 1
        if (r.location === 'SL Marketplace') {
            map[name].marketplaceGross += r.gross
        } else {
            map[name].casperGross += r.gross
        }
    }
    return Object.values(map).map((d) => ({
        ...d,
        avgPrice: d.count > 0 ? d.gross / d.count : 0,
    }))
}

/**
 * チャネル別集計（ドーナツ用）
 * @param {Array} rows
 * @returns {{marketplace: number, casper: number, total: number}}
 */
export function aggregateByChannel(rows) {
    let marketplace = 0, casper = 0
    for (const r of rows) {
        if (!r.isPaid) continue
        if (r.location === 'SL Marketplace') marketplace += r.gross
        else casper += r.gross
    }
    return { marketplace, casper, total: marketplace + casper }
}

/**
 * Location別売上集計（ドーナツ多分割用）
 * 「SL Marketplace」と各インワールド場所名を個別に集計する
 * @param {Array} rows
 * @returns {Array<{location, gross, count, pct, isMarketplace}>}
 */
export function aggregateByLocation(rows) {
    const map = {}
    let totalGross = 0
    for (const r of rows) {
        if (!r.isPaid) continue
        const loc = r.location || '（不明）'
        if (!map[loc]) map[loc] = { location: loc, gross: 0, count: 0, isMarketplace: loc === 'SL Marketplace' }
        map[loc].gross += r.gross
        map[loc].count += 1
        totalGross += r.gross
    }
    return Object.values(map)
        .map((d) => ({ ...d, pct: totalGross > 0 ? (d.gross / totalGross) * 100 : 0 }))
        .sort((a, b) => b.gross - a.gross)
}

/**
 * 月別チャネル別集計（時系列依存率）
 * @param {Array} rows
 * @returns {Array<{yearMonth, marketplace, casper, dependencyPct}>}
 */
export function aggregateChannelByMonth(rows) {
    const map = {}
    for (const r of rows) {
        if (!r.isPaid) continue
        const ym = r.yearMonth
        if (!map[ym]) map[ym] = { yearMonth: ym, year: r.year, month: r.month, marketplace: 0, casper: 0 }
        if (r.location === 'SL Marketplace') map[ym].marketplace += r.gross
        else map[ym].casper += r.gross
    }
    return Object.values(map).sort((a, b) => a.yearMonth.localeCompare(b.yearMonth)).map((d) => {
        const total = d.marketplace + d.casper
        return {
            ...d,
            total,
            dependencyPct: total > 0 ? (d.marketplace / total) * 100 : 0,
        }
    })
}

/**
 * 価格帯ゾーン集計
 * @param {Array} rows
 * @param {Array<{name, min, max}>} zones - ゾーン定義
 * @returns {Array<{name, gross, count, pct}>}
 */
export function aggregateByPriceZone(rows, zones) {
    const map = {}
    for (const z of zones) {
        map[z.name] = { name: z.name, gross: 0, count: 0, color: z.color }
    }
    let totalGross = 0
    for (const r of rows) {
        if (!r.isPaid) continue
        const zone = zones.find((z) => r.gross >= z.min && r.gross <= z.max)
        if (zone) {
            map[zone.name].gross += r.gross
            map[zone.name].count += 1
            totalGross += r.gross
        }
    }
    return Object.values(map).map((d) => ({
        ...d,
        pct: totalGross > 0 ? (d.gross / totalGross) * 100 : 0,
    }))
}

/**
 * ロングテール・パレート用データ生成
 * @param {Array} rows
 * @returns {Array<{rank, productName, gross, cumulativePct, group}>}
 */
export function buildLongTailData(rows) {
    const products = aggregateByProduct(rows).sort((a, b) => b.gross - a.gross)
    const totalGross = products.reduce((s, p) => s + p.gross, 0)
    let cumulative = 0
    return products.map((p, i) => {
        cumulative += p.gross
        const cumulativePct = totalGross > 0 ? (cumulative / totalGross) * 100 : 0
        let group = 'C'
        if (cumulativePct <= 80) group = 'A'
        else if (cumulativePct <= 95) group = 'B'
        return {
            rank: i + 1,
            productName: p.productName,
            gross: p.gross,
            count: p.count,
            cumulativePct,
            group,
        }
    })
}

/**
 * 商品寿命データ生成（初売日・最終売日）
 * @param {Array} rows
 * @returns {Array<{productName, firstDate, lastDate, daysActive, gross, monthlyData}>}
 */
export function buildLifecycleData(rows) {
    const map = {}
    for (const r of rows) {
        if (!r.isPaid || !r.date) continue
        const name = r.productName
        if (!map[name]) {
            map[name] = {
                productName: name,
                firstDate: r.date,
                lastDate: r.date,
                gross: 0,
                count: 0,
                monthly: {},
            }
        }
        if (r.date < map[name].firstDate) map[name].firstDate = r.date
        if (r.date > map[name].lastDate) map[name].lastDate = r.date
        map[name].gross += r.gross
        map[name].count += 1
        const ym = r.yearMonth
        if (!map[name].monthly[ym]) map[name].monthly[ym] = 0
        map[name].monthly[ym] += r.gross
    }

    // 直近3ヶ月のデータを取得して衰退判定
    const now = new Date()
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)

    return Object.values(map)
        .map((d) => {
            const daysActive = Math.round((d.lastDate - d.firstDate) / (1000 * 60 * 60 * 24)) + 1
            // 直近3ヶ月売上
            const recentGross = Object.entries(d.monthly)
                .filter(([ym]) => {
                    const dt = new Date(ym + '-01')
                    return dt >= threeMonthsAgo
                })
                .reduce((s, [, g]) => s + g, 0)
            // 3〜6ヶ月前売上
            const prevGross = Object.entries(d.monthly)
                .filter(([ym]) => {
                    const dt = new Date(ym + '-01')
                    return dt >= sixMonthsAgo && dt < threeMonthsAgo
                })
                .reduce((s, [, g]) => s + g, 0)
            // 2ヶ月以内に初登場
            const isNew = d.firstDate >= twoMonthsAgo
            // 急落判定（直近50%以下 かつ件数あり）
            const isDecline = prevGross > 0 && recentGross < prevGross * 0.5
            // 6ヶ月以内に売上急落（短命）
            const isShortLived = daysActive <= 180 && isDecline

            return {
                ...d,
                daysActive,
                recentGross,
                prevGross,
                isNew,
                isDecline,
                isShortLived,
                monthlyData: Object.entries(d.monthly)
                    .map(([ym, g]) => ({ yearMonth: ym, gross: g }))
                    .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth)),
            }
        })
        .sort((a, b) => b.gross - a.gross)
}

/**
 * DEMO商品集計（Gross === 0）
 * @param {Array} rows
 * @returns {Array<{productName, count}>}
 */
export function aggregateDemoProducts(rows) {
    const map = {}
    for (const r of rows) {
        if (!r.isComplete || !r.isDemo) continue
        const name = r.productName
        if (!map[name]) map[name] = { productName: name, count: 0 }
        map[name].count += r.quantity
    }
    return Object.values(map).sort((a, b) => b.count - a.count)
}

/**
 * ギフト商品集計
 * FromName !== ToName の有償取引（贈り物として購入された商品）を集計する
 * @param {Array} rows - 全トランザクション（フィルター前でも可）
 * @returns {Array<{productName, giftCount, giftGross, selfCount, selfGross, giftRatio}>}
 */
export function aggregateGiftProducts(rows) {
    const map = {}
    for (const r of rows) {
        if (!r.isPaid) continue
        const isGift = r.fromName && r.toName && r.fromName.trim() !== r.toName.trim()
        const name = r.productName
        if (!map[name]) {
            map[name] = { productName: name, giftCount: 0, giftGross: 0, selfCount: 0, selfGross: 0 }
        }
        if (isGift) {
            map[name].giftCount += 1
            map[name].giftGross += r.gross
        } else {
            map[name].selfCount += 1
            map[name].selfGross += r.gross
        }
    }
    return Object.values(map)
        .filter((d) => d.giftCount > 0)
        .map((d) => {
            const totalCount = d.giftCount + d.selfCount
            return {
                ...d,
                avgPrice: d.giftCount > 0 ? d.giftGross / d.giftCount : 0,
                giftRatio: totalCount > 0 ? (d.giftCount / totalCount) * 100 : 0,
            }
        })
        .sort((a, b) => b.giftCount - a.giftCount)
}

/**
 * DEMO効果分析データ生成
 * 商品ごとにDEMO DL数と有償売上を紐づけ、DEMOあり/なし商品を比較する
 *
 * @param {Array} rows - 全トランザクション（applyFilters適用済み、ただしexcludeDemo=falseで渡すこと）
 * @returns {{
 *   products: Array,        // 商品ごとの詳細
 *   withDemo: Array,        // DEMOあり有償商品
 *   withoutDemo: Array,     // DEMOなし有償商品
 *   demoOnlyProducts: Array,// 有償売上ゼロのDEMO商品
 *   comparison: Object,     // DEMOあり/なしの平均値比較
 *   monthlyDemoVsPaid: Array // 月別DEMOダウンロード数vs有償件数
 * }}
 */
export function buildDemoEffectData(rows) {
    // 商品ごとに集計
    const map = {}
    for (const r of rows) {
        if (!r.isComplete) continue
        const name = r.productName
        if (!map[name]) {
            map[name] = {
                productName: name,
                demoCount: 0,       // DEMOダウンロード件数
                paidCount: 0,       // 有償トランザクション件数
                paidGross: 0,       // 有償売上合計
                firstDemoDate: null,
                firstPaidDate: null,
                monthlyDemo: {},    // yearMonth -> demoCount
                monthlyPaid: {},    // yearMonth -> paidGross
            }
        }
        const d = map[name]
        if (r.isDemo) {
            // DEMO（Gross=0）
            d.demoCount += r.quantity ?? 1
            if (!d.firstDemoDate || (r.date && r.date < d.firstDemoDate)) d.firstDemoDate = r.date
            if (r.yearMonth) d.monthlyDemo[r.yearMonth] = (d.monthlyDemo[r.yearMonth] || 0) + (r.quantity ?? 1)
        } else if (r.isPaid) {
            // 有償
            d.paidCount += 1
            d.paidGross += r.gross
            if (!d.firstPaidDate || (r.date && r.date < d.firstPaidDate)) d.firstPaidDate = r.date
            if (r.yearMonth) d.monthlyPaid[r.yearMonth] = (d.monthlyPaid[r.yearMonth] || 0) + r.gross
        }
    }

    const allProducts = Object.values(map)

    // --- グループ分け ---
    const withDemo = allProducts.filter((p) => p.demoCount > 0 && p.paidGross > 0)
    const withoutDemo = allProducts.filter((p) => p.demoCount === 0 && p.paidGross > 0)
    const demoOnlyProducts = allProducts.filter((p) => p.demoCount > 0 && p.paidGross === 0)

    // --- 比較サマリー ---
    const avg = (arr, key) => arr.length > 0 ? arr.reduce((s, d) => s + d[key], 0) / arr.length : 0
    const comparison = {
        withDemoCount: withDemo.length,
        withoutDemoCount: withoutDemo.length,
        demoOnlyCount: demoOnlyProducts.length,
        avgGrossWithDemo: avg(withDemo, 'paidGross'),
        avgGrossWithoutDemo: avg(withoutDemo, 'paidGross'),
        avgPaidCountWithDemo: avg(withDemo, 'paidCount'),
        avgPaidCountWithoutDemo: avg(withoutDemo, 'paidCount'),
        avgDemoCount: avg(withDemo, 'demoCount'),
    }

    // --- 月別DEMOダウンロード vs 有償件数 ---
    const monthlyMap = {}
    for (const r of rows) {
        if (!r.isComplete || !r.yearMonth) continue
        const ym = r.yearMonth
        if (!monthlyMap[ym]) monthlyMap[ym] = { yearMonth: ym, demoCount: 0, paidCount: 0, paidGross: 0 }
        if (r.isDemo) monthlyMap[ym].demoCount += r.quantity ?? 1
        else if (r.isPaid) {
            monthlyMap[ym].paidCount += 1
            monthlyMap[ym].paidGross += r.gross
        }
    }
    const monthlyDemoVsPaid = Object.values(monthlyMap).sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))

    // 商品ごとの詳細を返す（DEMOあり優先で売上降順）
    const products = [
        ...withDemo.sort((a, b) => b.paidGross - a.paidGross),
        ...demoOnlyProducts.sort((a, b) => b.demoCount - a.demoCount),
        ...withoutDemo.sort((a, b) => b.paidGross - a.paidGross),
    ]

    return { products, withDemo, withoutDemo, demoOnlyProducts, comparison, monthlyDemoVsPaid }
}

/**
 * 利用可能な年リストを返す
 * @param {Array} rows
 * @returns {Array<number>}
 */
export function getAvailableYears(rows) {
    const years = new Set()
    for (const r of rows) {
        if (r.year) years.add(r.year)
    }
    return Array.from(years).sort()
}

/**
 * ヒートマップ用：年×月の売上マトリクス
 * @param {Array} monthData - aggregateByMonth の結果
 * @returns {{years: number[], months: number[], matrix: Object}}
 */
export function buildHeatmapMatrix(monthData) {
    const years = [...new Set(monthData.map((d) => d.year))].sort()
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    const matrix = {}
    for (const d of monthData) {
        if (!matrix[d.year]) matrix[d.year] = {}
        matrix[d.year][d.month] = d.gross
    }
    return { years, months, matrix }
}

/**
 * 商品ポートフォリオ分析
 * 各商品の売上推移パターンからA/B/Cタイプに分類する
 *
 * A（基盤商品）: 12ヶ月以上継続して売れており、直近も安定している
 * B（ブースト商品）: リリース後3〜6ヶ月にピークがあり、その後緩やかに減少
 * C（瞬間型商品）: 初月〜2ヶ月だけ売れてその後ほぼ止まる
 *
 * @param {Array} rows - isPaid==trueのトランザクション
 * @returns {Array<{productName, type, typeLabel, reason, gross, count, monthsActive, monthlyData, peakMonthIdx, decayRatio, recentRatio}>}
 */
export function buildPortfolioData(rows) {
    // 商品ごとに月別売上を集計
    const map = {}
    for (const r of rows) {
        if (!r.isPaid || !r.date) continue
        const name = r.productName
        if (!map[name]) {
            map[name] = {
                productName: name,
                firstDate: r.date,
                lastDate: r.date,
                gross: 0,
                count: 0,
                monthly: {},  // yearMonth -> gross
            }
        }
        if (r.date < map[name].firstDate) map[name].firstDate = r.date
        if (r.date > map[name].lastDate) map[name].lastDate = r.date
        map[name].gross += r.gross
        map[name].count += 1
        const ym = r.yearMonth
        if (!map[name].monthly[ym]) map[name].monthly[ym] = 0
        map[name].monthly[ym] += r.gross
    }

    const now = new Date('2026-03-31') // データの最終月を基準に

    return Object.values(map).map((d) => {
        // リリースから現在までの月数
        const monthsSpan = Math.round((d.lastDate - d.firstDate) / (1000 * 60 * 60 * 24 * 30)) + 1

        // 月別売上を発売順に並べる（発売月からの相対インデックス）
        const sortedMonths = Object.entries(d.monthly)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([ym, g]) => ({ ym, g }))

        const totalMonths = sortedMonths.length
        if (totalMonths === 0) {
            return { ...d, type: 'C', typeLabel: '瞬間型', monthlyData: [], monthsSpan: 0, peakMonthIdx: 0, decayRatio: 0, recentRatio: 0, reason: 'データ不足' }
        }

        const totalGross = sortedMonths.reduce((s, m) => s + m.g, 0)

        // ピーク月（最高売上の月）のインデックス（0=発売月）
        const peakMonthIdx = sortedMonths.reduce((pi, m, i) => m.g > sortedMonths[pi].g ? i : pi, 0)

        // 初期（発売〜3ヶ月）売上
        const earlyGross = sortedMonths.slice(0, 3).reduce((s, m) => s + m.g, 0)

        // 中期（4〜6ヶ月）売上
        const midGross = sortedMonths.slice(3, 6).reduce((s, m) => s + m.g, 0)

        // 直近3ヶ月の売上
        const recentMonths = sortedMonths.slice(-3)
        const recentGross = recentMonths.reduce((s, m) => s + m.g, 0)

        // 直近3ヶ月が実際に最近かどうか確認（3ヶ月以内に最終売上があるか）
        const lastSaleDate = d.lastDate
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
        const isStillActive = lastSaleDate >= threeMonthsAgo

        // 減衰比: 直近3ヶ月 / 初期3ヶ月（値が大きいほど安定持続）
        const decayRatio = earlyGross > 0 ? recentGross / earlyGross : 0

        // 直近売上比率: 直近3ヶ月 / 総売上
        const recentRatio = totalGross > 0 ? recentGross / totalGross : 0

        // ---- タイプ分類 ----
        let type, typeLabel, reason

        if (monthsSpan >= 12 && isStillActive && decayRatio >= 0.15) {
            // 12ヶ月以上かつ直近も安定して売れている → 基盤商品
            type = 'A'
            typeLabel = '基盤商品'
            reason = `${monthsSpan}ヶ月継続中・直近売上比 ${(decayRatio * 100).toFixed(0)}%`
        } else if (
            (monthsSpan >= 3 && monthsSpan < 12 && midGross > 0) ||
            (monthsSpan >= 12 && (!isStillActive || decayRatio < 0.15) && midGross > earlyGross * 0.15)
        ) {
            // 3〜12ヶ月、または12ヶ月超だが減衰傾向（中期まで有意な売上あり） → ブースト商品
            type = 'B'
            typeLabel = 'ブースト商品'
            reason = `ピーク${peakMonthIdx + 1}ヶ月目・中期売上あり`
        } else {
            // 短期で止まる or 初期だけ → 瞬間型
            type = 'C'
            typeLabel = '瞬間型'
            reason = monthsSpan < 3
                ? `販売期間${monthsSpan}ヶ月で終息`
                : `初速後に急落（直近比 ${(decayRatio * 100).toFixed(0)}%）`
        }

        return {
            productName: d.productName,
            type,
            typeLabel,
            reason,
            gross: d.gross,
            count: d.count,
            avgPrice: d.count > 0 ? d.gross / d.count : 0,
            monthsSpan,
            firstDate: d.firstDate,
            lastDate: d.lastDate,
            isStillActive,
            peakMonthIdx,
            decayRatio,
            recentRatio,
            earlyGross,
            midGross,
            recentGross,
            monthlyData: sortedMonths,
        }
    }).sort((a, b) => b.gross - a.gross)
}

/**
 * 売上診断データ生成
 * 複数の指標を組み合わせてクリエイタータイプを判定し、行動提案を返す
 * @param {Array} rows - 全トランザクション（applyFilters適用済み）
 * @returns {Object|null} 診断結果
 */
export function buildDiagnosisData(rows) {
    if (!rows?.length) return null

    const now = new Date()
    const recentYM = (n) => {
        const d = new Date(now)
        d.setMonth(d.getMonth() - n)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }
    const ym12ago = recentYM(12)
    const ym6ago = recentYM(6)
    const ym3ago = recentYM(3)

    // ─── 基本集計 ───
    let totalGross = 0, mpGross = 0, paidCount = 0
    const productGross = {}
    const monthlyGross = {}
    const activeProducts12m = new Set()

    for (const r of rows) {
        if (!r.isPaid) continue
        totalGross += r.gross
        paidCount += 1
        if (r.location === 'SL Marketplace') mpGross += r.gross
        productGross[r.productName] = (productGross[r.productName] || 0) + r.gross
        monthlyGross[r.yearMonth] = (monthlyGross[r.yearMonth] || 0) + r.gross
        if (r.yearMonth >= ym12ago) activeProducts12m.add(r.productName)
    }

    if (totalGross === 0) return null

    // ─── 指標計算 ───
    const marketplacePct = (mpGross / totalGross) * 100

    const sortedProducts = Object.entries(productGross).sort((a, b) => b[1] - a[1])
    const top3Gross = sortedProducts.slice(0, 3).reduce((s, [, g]) => s + g, 0)
    const top3Pct = (top3Gross / totalGross) * 100

    const activeCount = activeProducts12m.size

    const ymSorted = Object.keys(monthlyGross).sort()
    const recent3 = ymSorted.filter((ym) => ym >= ym3ago)
    const prev3 = ymSorted.filter((ym) => ym >= ym6ago && ym < ym3ago)
    const recent3Avg = recent3.length > 0 ? recent3.reduce((s, ym) => s + monthlyGross[ym], 0) / recent3.length : 0
    const prev3Avg = prev3.length > 0 ? prev3.reduce((s, ym) => s + monthlyGross[ym], 0) / prev3.length : 0
    const trendPct = prev3Avg > 0 ? ((recent3Avg / prev3Avg) - 1) * 100 : 0

    const avgUnitPrice = paidCount > 0 ? totalGross / paidCount : 0

    const top20n = Math.max(1, Math.ceil(sortedProducts.length * 0.2))
    const top20Gross = sortedProducts.slice(0, top20n).reduce((s, [, g]) => s + g, 0)
    const longTailPct = 100 - (top20Gross / totalGross) * 100

    // ─── 診断タイプ定義（優先度順） ───
    const TYPES = [
        {
            id: 'MP_CONCENTRATED',
            icon: '🛒',
            label: 'Marketplace集中型',
            color: '#ec4899',
            cond: () => marketplacePct > 65 && top3Pct > 65,
            summary: 'SL Marketplaceの特定商品に売上が集中しています。プラットフォームリスクとヒットリスクが重なっており、最も不安定な構成です。',
            strengths: ['Marketplaceの検索トラフィックを最大限活用できている', '人気商品の集客力が高い'],
            challenges: ['検索アルゴリズム変動で売上が急変するリスク', '主力商品の陳腐化・競合出現で大きなダメージを受ける'],
            actions: [
                '🏪 インワールドにCasperVendショップを開設し、Marketplace以外の販売導線を作る',
                '🎨 主力商品の系列・バリエーションを追加してヒット依存から脱却する',
                '📣 SLのイベント・グループに参加し、Marketplaceに頼らない集客を試みる',
            ],
        },
        {
            id: 'MP_DEPENDENT',
            icon: '🔗',
            label: 'Marketplace依存型',
            color: '#f59e0b',
            cond: () => marketplacePct > 65,
            summary: '売上の大部分がSL Marketplaceに集中しています。商品は分散していますが、チャネルリスクが高い状態です。',
            strengths: ['Marketplaceの検索トラフィックを効率よく獲得できている', '商品ラインナップは比較的充実'],
            challenges: ['Marketplaceの検索順位・アルゴリズム変動に売上が左右される', 'インワールド販路が弱い'],
            actions: [
                '🏠 インワールドショップの開設・強化で販売チャネルを多様化する',
                '📍 主要インワールド拠点への出店を検討する',
                '🎪 クリエイターイベント参加で認知度をMarketplace以外にも広げる',
            ],
        },
        {
            id: 'HIT_DEPENDENT',
            icon: '🎯',
            label: 'ヒット依存型',
            color: '#8b5cf6',
            cond: () => top3Pct > 70,
            summary: `上位3商品が全売上の${top3Pct.toFixed(0)}%を占めています。ヒット商品への依存が高く、次の主力候補の育成が課題です。`,
            strengths: ['主力商品の品質・人気が突出して高い', '大きなヒットを生み出せている'],
            challenges: ['主力商品の廃版・競合出現リスクで大幅な売上減の可能性', '新商品の育成が追いついていない'],
            actions: [
                '🛠️ 主力商品のアップデート・新バージョンをリリースし寿命を延ばす',
                '🌱 月1回のペースで新商品をリリースし「次のヒット」を育てる',
                '📦 主力商品のカラバリ・サイズ展開でラインナップを拡充する',
            ],
        },
        {
            id: 'GROWING',
            icon: '🚀',
            label: '急成長型',
            color: '#10b981',
            cond: () => trendPct > 25,
            summary: `直近3ヶ月の売上が前の3ヶ月比で+${trendPct.toFixed(0)}%と好調です。この勢いを持続させる戦略が重要です。`,
            strengths: ['売上トレンドが明確な上昇局面', '新商品や施策が市場に刺さっている'],
            challenges: ['急成長は一時的なブーストの可能性', '成長を維持するためのコンテンツ供給が必要'],
            actions: [
                '⚡ 人気商品に関連する新作を素早くリリースしてモメンタムを活かす',
                '📣 好調なうちにSNS告知・イベント参加で認知を拡大する',
                '📊 どのチャネル・商品が成長の主因か分析し、その施策に集中投資する',
            ],
        },
        {
            id: 'DECLINING',
            icon: '🔄',
            label: '転換期型',
            color: '#64748b',
            cond: () => trendPct < -20,
            summary: `直近3ヶ月の売上が前の3ヶ月比で-${Math.abs(trendPct).toFixed(0)}%となっています。商品・販路の見直しが必要な局面です。`,
            strengths: ['過去に実績のある商品・販路がある', '改善の伸びしろが大きい'],
            challenges: ['売上の下降トレンドが続いている', '主力商品の陳腐化や市場ニーズの変化の可能性'],
            actions: [
                '🔍 売上減少の原因（商品の古さ・競合出現・季節性）を各パネルで分析する',
                '🎨 既存の人気商品をリニューアル・アップデートして再注目を集める',
                '🆕 新カテゴリー・新ジャンルへのチャレンジで売上の軸を新たに作る',
            ],
        },
        {
            id: 'STABLE_DIVERSIFIED',
            icon: '🏛️',
            label: '安定分散型',
            color: '#3b82f6',
            cond: () => marketplacePct < 50 && top3Pct < 60 && activeCount >= 8,
            summary: '複数のチャネルと商品群に売上が分散しており、リスクの低い安定した構成です。',
            strengths: ['特定チャネル・商品への依存が低く外部変動に強い', '複数の収益源が安定基盤を作っている'],
            challenges: ['際立ったヒットが生まれにくい', '注力点が分散して成長の加速がしにくい'],
            actions: [
                '💡 ロングテール商品の中から成長候補を選び、マーケティングを集中投下する',
                '📈 最も伸びているチャネルに積極的に新作を投入する',
                '🔍 商品ポートフォリオを整理し、A型（基盤）商品の比率をさらに高める',
            ],
        },
        {
            id: 'SMALL_CONCENTRATED',
            icon: '💎',
            label: '少数精鋭型',
            color: '#06b6d4',
            cond: () => activeCount <= 5,
            summary: `アクティブ商品が${activeCount}点と少数ですが、各商品の存在感が高い状態です。`,
            strengths: ['各商品に集中してクオリティを高められる', '管理が容易でリリースサイクルが明確'],
            challenges: ['商品数が少なく売上の変動リスクが高い', '主力商品のライフサイクル終了リスクが顕著'],
            actions: [
                '🌱 年間2〜4点の新商品リリースを目標に品揃えを徐々に増やす',
                '🎨 既存商品のバリエーション展開で商品ラインを拡充する',
                '📦 過去ヒット商品のリメイク・新バージョンで長期収益を確保する',
            ],
        },
        {
            id: 'BALANCED',
            icon: '⚖️',
            label: 'バランス型',
            color: '#6366f1',
            cond: () => true,
            summary: '複数の指標が中庸な状態です。各軸を少しずつ強化することで全体的な向上が見込めます。',
            strengths: ['特定の弱点が突出していない', '改善の方向性を自分で選択できる余地がある'],
            challenges: ['際立った強みを作りにくい', 'まず注力すべき課題を絞り込む必要がある'],
            actions: [
                '📊 Marketplace依存率・ヒット集中度のうちリスクが高い方から改善に着手する',
                '🆕 月1本のペースで新商品をリリースし、売上の幅を広げる',
                '📣 SNS・イベント告知でインワールドの認知を高め、チャネルを多様化する',
            ],
        },
    ]

    const primaryType = TYPES.find((t) => t.cond())
    const subTypes = TYPES.filter((t) => t.id !== primaryType.id && t.id !== 'BALANCED' && t.cond()).slice(0, 2)

    return {
        scores: { marketplacePct, top3Pct, longTailPct, trendPct, activeCount, avgUnitPrice },
        primaryType,
        subTypes,
        totalGross,
        paidCount,
        sortedProducts: sortedProducts.slice(0, 5).map(([name, gross]) => ({
            name, gross, pct: (gross / totalGross) * 100,
        })),
    }
}
