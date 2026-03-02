/**
 * 商品ポートフォリオ分析パネル
 * 売上推移パターンから各商品をA/B/Cに分類して可視化する
 *
 * A（基盤商品）: 1年以上安定して売れ続ける収入の柱
 * B（ブースト商品）: リリース後3〜6ヶ月強く、その後緩やかに減少する補充枠
 * C（瞬間型商品）: 初速のみで止まる、労力対効果が悪い商品
 */
import { useMemo, useRef, useState } from 'react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, ScatterChart, Scatter, Cell,
    LineChart, Line,
} from 'recharts'
import { buildPortfolioData, applyFilters, fmtLS, fmtNum } from '../../utils/dataHelpers'
import DataTable from '../shared/DataTable'
import ExportBtn from '../shared/ExportBtn'

// タイプ別のカラー・スタイル定義
const TYPE_CONFIG = {
    A: {
        label: 'A：基盤商品',
        sublabel: '1年以上継続・収入の柱',
        color: '#10b981',
        bgColor: 'rgba(16,185,129,0.12)',
        borderColor: 'rgba(16,185,129,0.35)',
        icon: '🏛',
        action: '在庫切れ・廃版にしない。品質維持と定期アップデートで長期収益を確保する。',
    },
    B: {
        label: 'B：ブースト商品',
        sublabel: 'リリース後3〜6ヶ月に強い',
        color: '#3b82f6',
        bgColor: 'rgba(59,130,246,0.12)',
        borderColor: 'rgba(59,130,246,0.35)',
        icon: '🚀',
        action: '定期的に新商品をリリースしてブースト枠を補充する。シーズン性を意識したタイミングが効果的。',
    },
    C: {
        label: 'C：瞬間型',
        sublabel: '初速のみ・労力対効果が低い',
        color: '#f59e0b',
        bgColor: 'rgba(245,158,11,0.12)',
        borderColor: 'rgba(245,158,11,0.35)',
        icon: '⚡',
        action: '価格設定・マーケティングを見直す。需要の薄い理由を分析し、改善するか注力リソースを減らす。',
    },
}

// sparkline（ミニ折れ線）レンダラー
function Sparkline({ data, color }) {
    if (!data?.length) return null
    const maxG = Math.max(...data.map((d) => d.g), 1)
    const w = 80, h = 28
    const pts = data.map((d, i) => {
        const x = (i / Math.max(data.length - 1, 1)) * w
        const y = h - (d.g / maxG) * h
        return `${x},${y}`
    }).join(' ')
    return (
        <svg width={w} height={h} style={{ display: 'block' }}>
            <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} />
        </svg>
    )
}

// カスタムツールチップ
function CustomTooltip({ active, payload }) {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    if (!d) return null
    const cfg = TYPE_CONFIG[d.type]
    return (
        <div className="custom-tooltip" style={{ maxWidth: 240 }}>
            <div className="custom-tooltip-label" style={{ whiteSpace: 'normal', marginBottom: '0.3rem' }}>{d.productName}</div>
            <div className="custom-tooltip-item"><span style={{ color: cfg.color }}>{cfg.label}</span></div>
            <div className="custom-tooltip-item"><span>売上</span><span className="custom-tooltip-value">{fmtLS(d.gross)}</span></div>
            <div className="custom-tooltip-item"><span>販売期間</span><span className="custom-tooltip-value">{d.monthsSpan}ヶ月</span></div>
            <div className="custom-tooltip-item"><span>判定理由</span><span className="custom-tooltip-value" style={{ whiteSpace: 'normal' }}>{d.reason}</span></div>
        </div>
    )
}

export default function ProductPortfolio({ rows, filters }) {
    const panelRef = useRef()
    const [activeType, setActiveType] = useState('all')
    const [selectedProduct, setSelectedProduct] = useState(null)

    const portfolioData = useMemo(() => {
        if (!rows?.length) return []
        const filtered = applyFilters(rows, filters)
        return buildPortfolioData(filtered)
    }, [rows, filters])

    // タイプ別集計
    const summary = useMemo(() => {
        const result = { A: [], B: [], C: [] }
        for (const d of portfolioData) result[d.type].push(d)
        return result
    }, [portfolioData])

    // 表示フィルタ
    const displayed = activeType === 'all' ? portfolioData : portfolioData.filter((d) => d.type === activeType)

    // タイプ別売上集計（棒グラフ用）
    const barData = ['A', 'B', 'C'].map((t) => ({
        name: TYPE_CONFIG[t].label.split('：')[1],
        gross: summary[t].reduce((s, d) => s + d.gross, 0),
        count: summary[t].length,
        type: t,
    }))

    // テーブル列定義
    const columns = [
        {
            key: 'type', label: 'タイプ', align: 'center',
            render: (v) => {
                const cfg = TYPE_CONFIG[v]
                return <span className="badge" style={{ background: cfg.bgColor, color: cfg.color, border: `1px solid ${cfg.borderColor}` }}>{cfg.icon} {TYPE_CONFIG[v].label}</span>
            },
        },
        {
            key: 'productName', label: '商品名',
            render: (v) => <span title={v} style={{ maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>,
        },
        { key: 'gross', label: '総売上', align: 'right', render: (v) => fmtLS(v) },
        { key: 'count', label: '件数', align: 'right', render: (v) => fmtNum(v) },
        { key: 'monthsSpan', label: '販売期間', align: 'right', render: (v) => `${v}ヶ月` },
        {
            key: 'decayRatio', label: '持続率', align: 'right',
            render: (v) => {
                const pct = Math.round(v * 100)
                const color = pct >= 50 ? 'var(--accent-green)' : pct >= 20 ? 'var(--accent-yellow)' : 'var(--accent-red)'
                return <span style={{ color, fontWeight: 600 }}>{pct}%</span>
            },
        },
        {
            key: 'monthlyData', label: '推移', align: 'center',
            render: (v, row) => <Sparkline data={v} color={TYPE_CONFIG[row.type].color} />,
        },
        { key: 'reason', label: '判定理由', render: (v) => <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{v}</span> },
    ]

    const csvHeaders = ['タイプ', '商品名', '総売上(L$)', '件数', '販売期間(月)', '持続率(%)', '判定理由']
    const csvRows = portfolioData.map((d) => [
        d.typeLabel, d.productName, Math.round(d.gross), d.count, d.monthsSpan,
        Math.round(d.decayRatio * 100), d.reason,
    ])

    // 選択商品の月別推移
    const selectedData = selectedProduct
        ? portfolioData.find((d) => d.productName === selectedProduct)
        : null

    return (
        <div ref={panelRef}>
            {/* タイプ別サマリーカード */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '1rem' }}>
                {['A', 'B', 'C'].map((t) => {
                    const cfg = TYPE_CONFIG[t]
                    const items = summary[t]
                    const totalGross = items.reduce((s, d) => s + d.gross, 0)
                    return (
                        <div
                            key={t}
                            className="panel-section"
                            style={{ cursor: 'pointer', border: activeType === t ? `1px solid ${cfg.color}` : undefined, transition: 'border 0.2s' }}
                            onClick={() => setActiveType(activeType === t ? 'all' : t)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <span style={{ fontSize: '1.5rem' }}>{cfg.icon}</span>
                                <div>
                                    <div style={{ fontWeight: 700, color: cfg.color, fontSize: '0.9rem' }}>{cfg.label}</div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{cfg.sublabel}</div>
                                </div>
                            </div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>{items.length} 商品</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{fmtLS(totalGross)}</div>
                            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{cfg.action}</div>
                        </div>
                    )
                })}
            </div>

            {/* タイプ別売上棒グラフ */}
            <div className="panel-section">
                <div className="panel-header">
                    <div>
                        <div className="panel-title">📊 商品ポートフォリオ分析</div>
                        <div className="panel-sub">タイプ別売上合計 / 商品数の比較</div>
                    </div>
                    <ExportBtn panelRef={panelRef} csvHeaders={csvHeaders} csvRows={csvRows} fileBaseName="product-portfolio" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    {/* 売上棒グラフ */}
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>タイプ別 総売上（L$）</div>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={barData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                                <Tooltip formatter={(v) => fmtLS(v)} />
                                <Bar dataKey="gross" name="売上（L$）" radius={[4, 4, 0, 0]}>
                                    {barData.map((d) => (
                                        <Cell key={d.type} fill={TYPE_CONFIG[d.type].color} opacity={activeType === 'all' || activeType === d.type ? 0.9 : 0.3} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    {/* 商品数棒グラフ */}
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>タイプ別 商品数</div>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={barData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                                <Tooltip formatter={(v) => `${v} 商品`} />
                                <Bar dataKey="count" name="商品数" radius={[4, 4, 0, 0]}>
                                    {barData.map((d) => (
                                        <Cell key={d.type} fill={TYPE_CONFIG[d.type].color} opacity={activeType === 'all' || activeType === d.type ? 0.9 : 0.3} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* タブ切り替え */}
                <div className="tab-bar" style={{ marginTop: '0.75rem' }}>
                    <button className={`tab-btn ${activeType === 'all' ? 'active' : ''}`} onClick={() => setActiveType('all')}>全商品</button>
                    {['A', 'B', 'C'].map((t) => (
                        <button key={t} className={`tab-btn ${activeType === t ? 'active' : ''}`}
                            style={activeType === t ? { color: TYPE_CONFIG[t].color, borderBottomColor: TYPE_CONFIG[t].color } : {}}
                            onClick={() => setActiveType(activeType === t ? 'all' : t)}>
                            {TYPE_CONFIG[t].icon} {TYPE_CONFIG[t].label} ({summary[t].length})
                        </button>
                    ))}
                </div>
            </div>

            {/* 選択商品の月別推移ドリルダウン */}
            {selectedData && (
                <div className="panel-section">
                    <div className="panel-header">
                        <div>
                            <div className="panel-title" style={{ color: TYPE_CONFIG[selectedData.type].color }}>
                                {TYPE_CONFIG[selectedData.type].icon} {selectedData.productName}
                            </div>
                            <div className="panel-sub">{selectedData.reason}</div>
                        </div>
                        <button className="export-btn" onClick={() => setSelectedProduct(null)}>✕ 閉じる</button>
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
                        <LineChart data={selectedData.monthlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="ym" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} interval="preserveStartEnd" />
                            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                            <Tooltip formatter={(v) => fmtLS(v)} labelFormatter={(l) => l} />
                            <Line type="monotone" dataKey="g" name="売上" stroke={TYPE_CONFIG[selectedData.type].color} strokeWidth={2.5} dot={{ r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* 商品一覧テーブル */}
            <div className="panel-section">
                <div className="panel-title" style={{ marginBottom: '0.75rem' }}>
                    📋 商品一覧 <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>（行をクリックで月別推移を表示）</span>
                </div>
                <div className="data-table-wrap" id="portfolio-table">
                    <table className="data-table">
                        <thead>
                            <tr>
                                {columns.map((c) => <th key={c.key} style={{ textAlign: c.align || 'left' }}>{c.label}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {displayed.map((row) => (
                                <tr
                                    key={row.productName}
                                    onClick={() => setSelectedProduct(selectedProduct === row.productName ? null : row.productName)}
                                    style={{ cursor: 'pointer', background: selectedProduct === row.productName ? 'rgba(59,130,246,0.08)' : undefined }}
                                >
                                    {columns.map((c) => (
                                        <td key={c.key} style={{ textAlign: c.align || 'left' }}>
                                            {c.render ? c.render(row[c.key], row) : row[c.key] ?? '—'}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
