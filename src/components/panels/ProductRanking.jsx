/**
 * 商品ランキングパネル（3.3）
 * 横棒グラフ：上位20商品の売上/件数ランキング
 * ギフトタブ：FromName != ToName の贈り物ランキングを追加
 */
import { useMemo, useRef, useState } from 'react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer,
} from 'recharts'
import { aggregateByProduct, aggregateDemoProducts, aggregateGiftProducts, applyFilters, fmtLS, fmtNum } from '../../utils/dataHelpers'
import DataTable from '../shared/DataTable'
import ExportBtn from '../shared/ExportBtn'

const LIMIT_OPTIONS = [
    { value: 10, label: 'Top 10' },
    { value: 20, label: 'Top 20' },
    { value: 999, label: '全件' },
]

// 売上/件数ランキング用ツールチップ
function CustomTooltip({ active, payload, label, sortKey }) {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    if (!d) return null
    return (
        <div className="custom-tooltip">
            <div className="custom-tooltip-label" style={{ maxWidth: 220, whiteSpace: 'normal' }}>{label}</div>
            <div className="custom-tooltip-item"><span style={{ color: 'var(--chart-1)' }}>Marketplace</span><span className="custom-tooltip-value">{fmtLS(d.marketplaceGross)}</span></div>
            <div className="custom-tooltip-item"><span style={{ color: 'var(--chart-2)' }}>CasperVend</span><span className="custom-tooltip-value">{fmtLS(d.casperGross)}</span></div>
            <div className="custom-tooltip-item"><span>取引件数</span><span className="custom-tooltip-value">{fmtNum(d.count)} 件</span></div>
            <div className="custom-tooltip-item"><span>客単価</span><span className="custom-tooltip-value">{fmtLS(d.avgPrice)}</span></div>
        </div>
    )
}

// ギフトランキング用ツールチップ
function GiftTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    if (!d) return null
    return (
        <div className="custom-tooltip">
            <div className="custom-tooltip-label" style={{ maxWidth: 220, whiteSpace: 'normal' }}>{label}</div>
            <div className="custom-tooltip-item"><span style={{ color: 'var(--accent-pink)' }}>ギフト件数</span><span className="custom-tooltip-value">{fmtNum(d.giftCount)} 件</span></div>
            <div className="custom-tooltip-item"><span>ギフト売上</span><span className="custom-tooltip-value">{fmtLS(d.giftGross)}</span></div>
            <div className="custom-tooltip-item"><span>ギフト比率</span><span className="custom-tooltip-value">{d.giftRatio?.toFixed(1)}%</span></div>
            <div className="custom-tooltip-item"><span>平均価格</span><span className="custom-tooltip-value">{fmtLS(d.avgPrice)}</span></div>
        </div>
    )
}

export default function ProductRanking({ rows, filters }) {
    const panelRef = useRef()
    const [mode, setMode] = useState('gross')    // 'gross' | 'count' | 'gift'
    const [giftSort, setGiftSort] = useState('giftCount')  // 'giftCount' | 'giftGross' | 'giftRatio'
    const [limit, setLimit] = useState(20)
    const [search, setSearch] = useState('')

    // 通常ランキングデータ
    const { ranked, demoData } = useMemo(() => {
        if (!rows?.length) return { ranked: [], demoData: [] }
        const filtered = applyFilters(rows, filters)
        const sortKey = mode === 'count' ? 'count' : 'gross'
        const all = aggregateByProduct(filtered)
        const sortedAll = [...all].sort((a, b) => b[sortKey] - a[sortKey])
        const searched = search
            ? sortedAll.filter((d) => d.productName.toLowerCase().includes(search.toLowerCase()))
            : sortedAll
        const demo = aggregateDemoProducts(applyFilters(rows, { ...filters, excludeDemo: false }))
        return { ranked: searched.slice(0, limit), demoData: demo.slice(0, 10) }
    }, [rows, filters, mode, limit, search])

    // ギフトランキングデータ（グローバルフィルターのチャネル・年は適用、DEMO除外は維持）
    const giftRanked = useMemo(() => {
        if (!rows?.length) return []
        // フィルター適用（DEMOは元々有償のみ対象なので関係なし）
        const filtered = applyFilters(rows, { ...filters, excludeDemo: false })
        const all = aggregateGiftProducts(filtered)
        const sorted = [...all].sort((a, b) => b[giftSort] - a[giftSort])
        const searched = search
            ? sorted.filter((d) => d.productName.toLowerCase().includes(search.toLowerCase()))
            : sorted
        return searched.slice(0, limit)
    }, [rows, filters, giftSort, limit, search])

    // 通常ランキング テーブル列
    const rankColumns = [
        { key: '_rank', label: '#', align: 'center', render: (v) => v },
        { key: 'productName', label: '商品名', render: (v) => <span title={v} style={{ maxWidth: 260, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span> },
        { key: 'gross', label: '売上（L$）', align: 'right', render: (v) => fmtLS(v) },
        { key: 'count', label: '件数', align: 'right', render: (v) => fmtNum(v) },
        { key: 'avgPrice', label: '客単価', align: 'right', render: (v) => fmtLS(v) },
        { key: 'marketplaceGross', label: 'Marketplace', align: 'right', render: (v) => <span className="badge badge-blue">{fmtLS(v)}</span> },
        { key: 'casperGross', label: 'CasperVend', align: 'right', render: (v) => <span className="badge badge-green">{fmtLS(v)}</span> },
    ]

    // ギフトランキング テーブル列
    const giftColumns = [
        { key: '_rank', label: '#', align: 'center', render: (v) => v },
        { key: 'productName', label: '商品名', render: (v) => <span title={v} style={{ maxWidth: 240, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span> },
        { key: 'giftCount', label: 'ギフト件数', align: 'right', render: (v) => <span className="badge badge-red">{fmtNum(v)} 件</span> },
        { key: 'giftGross', label: 'ギフト売上', align: 'right', render: (v) => fmtLS(v) },
        { key: 'avgPrice', label: '平均価格', align: 'right', render: (v) => fmtLS(v) },
        {
            key: 'giftRatio', label: 'ギフト比率', align: 'right',
            render: (v) => {
                const color = v >= 50 ? 'var(--accent-pink)' : v >= 20 ? 'var(--accent-yellow)' : 'var(--text-muted)'
                return <span style={{ color, fontWeight: 600 }}>{v?.toFixed(1)}%</span>
            },
        },
        { key: 'selfCount', label: '自己購入件数', align: 'right', render: (v) => fmtNum(v) },
    ]

    const dataWithRank = ranked.map((d, i) => ({ ...d, _rank: i + 1 }))
    const giftWithRank = giftRanked.map((d, i) => ({ ...d, _rank: i + 1 }))

    const isGiftMode = mode === 'gift'

    return (
        <div ref={panelRef}>
            <div className="panel-section">
                <div className="panel-header">
                    <div>
                        <div className="panel-title">
                            {isGiftMode ? '🎁 商品ランキング（ギフト）' : '🏆 商品ランキング'}
                        </div>
                        <div className="panel-sub">
                            {isGiftMode
                                ? 'FromName ≠ ToName の有償取引 — 贈り物として購入された商品'
                                : '売上金額 / 販売件数 で並び替え可能'}
                        </div>
                    </div>
                    <ExportBtn
                        panelRef={panelRef}
                        csvHeaders={isGiftMode
                            ? ['順位', '商品名', 'ギフト件数', 'ギフト売上(L$)', '平均価格(L$)', 'ギフト比率(%)', '自己購入件数']
                            : ['順位', '商品名', '売上(L$)', '件数', '客単価(L$)', 'Marketplace(L$)', 'CasperVend(L$)']}
                        csvRows={isGiftMode
                            ? giftRanked.map((d, i) => [i + 1, d.productName, d.giftCount, Math.round(d.giftGross), Math.round(d.avgPrice), d.giftRatio?.toFixed(1), d.selfCount])
                            : ranked.map((d, i) => [i + 1, d.productName, Math.round(d.gross), d.count, Math.round(d.avgPrice), Math.round(d.marketplaceGross), Math.round(d.casperGross)])}
                        fileBaseName={isGiftMode ? 'gift-ranking' : 'product-ranking'}
                    />
                </div>

                {/* モードタブ */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div className="tab-bar" style={{ borderBottom: 'none', marginBottom: 0 }}>
                        <button className={`tab-btn ${mode === 'gross' ? 'active' : ''}`} onClick={() => setMode('gross')}>売上金額順</button>
                        <button className={`tab-btn ${mode === 'count' ? 'active' : ''}`} onClick={() => setMode('count')}>販売件数順</button>
                        <button
                            className={`tab-btn ${mode === 'gift' ? 'active' : ''}`}
                            style={mode === 'gift' ? { color: 'var(--accent-pink)', borderBottomColor: 'var(--accent-pink)' } : {}}
                            onClick={() => setMode('gift')}
                        >🎁 ギフト</button>
                    </div>
                    <div className="select-group">
                        {/* ギフトモード時のサブソート */}
                        {isGiftMode && (
                            <>
                                <button className={`tab-btn ${giftSort === 'giftCount' ? 'active' : ''}`} onClick={() => setGiftSort('giftCount')}>件数順</button>
                                <button className={`tab-btn ${giftSort === 'giftGross' ? 'active' : ''}`} onClick={() => setGiftSort('giftGross')}>売上順</button>
                                <button className={`tab-btn ${giftSort === 'giftRatio' ? 'active' : ''}`} onClick={() => setGiftSort('giftRatio')}>比率順</button>
                            </>
                        )}
                        {LIMIT_OPTIONS.map((o) => (
                            <button key={o.value} className={`tab-btn ${limit === o.value ? 'active' : ''}`} onClick={() => setLimit(o.value)}>{o.label}</button>
                        ))}
                        <input className="search-input" placeholder="商品名で検索..." value={search} onChange={(e) => setSearch(e.target.value)} id="product-search" />
                    </div>
                </div>

                {/* 横棒グラフ */}
                {isGiftMode ? (
                    /* ギフトグラフ */
                    <ResponsiveContainer width="100%" height={Math.max(300, giftRanked.length * 28)}>
                        <BarChart data={giftRanked} layout="vertical" margin={{ top: 5, right: 80, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                            <XAxis
                                type="number"
                                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                                tickFormatter={giftSort === 'giftRatio'
                                    ? (v) => `${v.toFixed(0)}%`
                                    : giftSort === 'giftGross'
                                        ? (v) => `${(v / 1000).toFixed(0)}K`
                                        : (v) => fmtNum(v)}
                            />
                            <YAxis
                                type="category"
                                dataKey="productName"
                                width={170}
                                tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                                tickFormatter={(v) => v.length > 22 ? v.slice(0, 22) + '…' : v}
                            />
                            <Tooltip content={<GiftTooltip />} />
                            <Bar
                                dataKey={giftSort}
                                name={giftSort === 'giftCount' ? 'ギフト件数' : giftSort === 'giftGross' ? 'ギフト売上' : 'ギフト比率(%)'}
                                fill="var(--accent-pink)"
                                radius={[0, 4, 4, 0]}
                                opacity={0.85}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    /* 通常グラフ */
                    <ResponsiveContainer width="100%" height={Math.max(300, ranked.length * 28)}>
                        <BarChart data={ranked} layout="vertical" margin={{ top: 5, right: 80, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                            <XAxis
                                type="number"
                                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                                tickFormatter={mode === 'count' ? (v) => fmtNum(v) : (v) => `${(v / 1000).toFixed(0)}K`}
                            />
                            <YAxis
                                type="category"
                                dataKey="productName"
                                width={170}
                                tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                                tickFormatter={(v) => v.length > 22 ? v.slice(0, 22) + '…' : v}
                            />
                            <Tooltip content={<CustomTooltip sortKey={mode} />} />
                            {mode === 'gross' ? (
                                <>
                                    <Bar dataKey="marketplaceGross" name="SL Marketplace" stackId="a" fill="var(--chart-1)" />
                                    <Bar dataKey="casperGross" name="CasperVend" stackId="a" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
                                </>
                            ) : (
                                <Bar dataKey="count" name="販売件数" fill="var(--chart-3)" radius={[0, 4, 4, 0]} />
                            )}
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* データテーブル */}
            <div className="panel-section">
                <div className="panel-title" style={{ marginBottom: '0.75rem' }}>
                    {isGiftMode ? '🎁 ギフトランキング一覧' : '📋 商品一覧'}
                </div>
                {isGiftMode
                    ? <DataTable columns={giftColumns} data={giftWithRank} pageSize={20} id="gift-ranking-table" />
                    : <DataTable columns={rankColumns} data={dataWithRank} pageSize={20} id="ranking-table" />}
            </div>

            {/* ギフトモード: 総ギフト統計 */}
            {isGiftMode && giftRanked.length > 0 && (() => {
                const totalGiftCount = giftRanked.reduce((s, d) => s + d.giftCount, 0)
                const totalGiftGross = giftRanked.reduce((s, d) => s + d.giftGross, 0)
                const highRatio = giftRanked.filter((d) => d.giftRatio >= 30)
                return (
                    <div className="panel-section">
                        <div className="panel-title" style={{ marginBottom: '0.75rem' }}>📌 ギフト統計サマリー</div>
                        <div className="summary-cards">
                            <div className="summary-item">
                                <div className="summary-item-label">総ギフト件数</div>
                                <div className="summary-item-value" style={{ color: 'var(--accent-pink)' }}>{fmtNum(totalGiftCount)} 件</div>
                            </div>
                            <div className="summary-item">
                                <div className="summary-item-label">ギフト総売上</div>
                                <div className="summary-item-value">{fmtLS(totalGiftGross)}</div>
                            </div>
                            <div className="summary-item">
                                <div className="summary-item-label">ギフト比率30%超の商品</div>
                                <div className="summary-item-value">{fmtNum(highRatio.length)} 商品</div>
                            </div>
                        </div>
                        <div className="tip-box" style={{ marginTop: '0.75rem' }}>
                            💡 ギフト比率が高い商品はプレゼント需要が強い傾向があります。季節イベント（バレンタイン・クリスマスなど）に合わせたプロモーションが効果的かもしれません。
                        </div>
                    </div>
                )
            })()}

            {/* DEMOダウンロードランキング */}
            {!isGiftMode && demoData.length > 0 && (
                <div className="panel-section">
                    <div className="panel-title" style={{ marginBottom: '0.75rem' }}>🆓 DEMO ダウンロード数ランキング（上位10）</div>
                    <div className="data-table-wrap">
                        <table className="data-table">
                            <thead><tr><th>順位</th><th>商品名</th><th style={{ textAlign: 'right' }}>DL数</th></tr></thead>
                            <tbody>
                                {demoData.map((d, i) => (
                                    <tr key={d.productName}>
                                        <td style={{ textAlign: 'center' }}>{i + 1}</td>
                                        <td>{d.productName}</td>
                                        <td style={{ textAlign: 'right' }}><span className="badge badge-purple">{fmtNum(d.count)}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
