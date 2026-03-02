/**
 * 商品寿命分析パネル（4.5）
 * ガントチャート形式：X軸=時間軸、Y軸=商品名
 * バーの長さ=販売継続期間、色の濃さ=売上規模
 */
import { useMemo, useRef, useState } from 'react'
import { buildLifecycleData, applyFilters, fmtLS, fmtNum } from '../../utils/dataHelpers'
import ExportBtn from '../shared/ExportBtn'

// 売上規模に応じた色の濃さを返す（青系）
function salesToColor(gross, maxGross) {
    if (!gross || maxGross === 0) return 'rgba(59,130,246,0.08)'
    const ratio = Math.min(gross / maxGross, 1)
    const alpha = 0.15 + ratio * 0.75
    return `rgba(59, 130, 246, ${alpha})`
}

// 時間軸の開始・終了
const TIME_START = new Date('2021-11-01')
const TIME_END = new Date('2026-04-01')
const TOTAL_MS = TIME_END - TIME_START

function pct(date) {
    return Math.max(0, Math.min(100, ((date - TIME_START) / TOTAL_MS) * 100))
}

// X軸のラベル（半年刻み）
const TIME_TICKS = []
for (let y = 2022; y <= 2026; y++) {
    for (const m of [1, 7]) {
        const d = new Date(y, m - 1, 1)
        if (d > TIME_START && d < TIME_END) {
            TIME_TICKS.push({ date: d, label: `${y}/${String(m).padStart(2, '0')}` })
        }
    }
}

export default function ProductLifecycle({ rows, filters }) {
    const panelRef = useRef()
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [showTop, setShowTop] = useState(40)

    const { allData, maxGross } = useMemo(() => {
        if (!rows?.length) return { allData: [], maxGross: 1 }
        const filtered = applyFilters(rows, filters)
        const d = buildLifecycleData(filtered)
        return { allData: d, maxGross: Math.max(...d.map((x) => x.gross), 1) }
    }, [rows, filters])

    // 表示するデータを売上上位から切り出す
    const displayData = allData.slice(0, showTop)

    // サマリー
    const longSellers = [...allData].sort((a, b) => b.daysActive - a.daysActive).slice(0, 10)
    const declining = allData.filter((d) => d.isDecline && !d.isNew).slice(0, 5)
    const newItems = allData.filter((d) => d.isNew).slice(0, 5)
    const shortLived = allData.filter((d) => d.isShortLived).slice(0, 5)

    return (
        <div ref={panelRef}>
            <div className="panel-section">
                <div className="panel-header">
                    <div>
                        <div className="panel-title">⏳ 商品寿命分析（ガントチャート）</div>
                        <div className="panel-sub">各商品の初売日〜最終売日のスパン（バーの色の濃さ = 売上規模）</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <select className="filter-select" value={showTop} onChange={(e) => setShowTop(Number(e.target.value))} id="lifecycle-limit">
                            <option value={20}>上位20</option>
                            <option value={40}>上位40</option>
                            <option value={80}>上位80</option>
                            <option value={999}>全件</option>
                        </select>
                        <ExportBtn panelRef={panelRef} csvHeaders={['商品名', '初売日', '最終売日', '販売日数', '売上(L$)', '状態']} csvRows={allData.map((d) => [d.productName, d.firstDate?.toISOString()?.slice(0, 10), d.lastDate?.toISOString()?.slice(0, 10), d.daysActive, Math.round(d.gross), d.isNew ? '新商品' : d.isDecline ? '衰退兆候' : ''])} fileBaseName="product-lifecycle" />
                    </div>
                </div>

                {/* ガントチャート本体 */}
                <div style={{ overflowY: 'auto', maxHeight: Math.min(displayData.length * 26 + 40, 600) }}>
                    {/* X軸ラベル */}
                    <div style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10, borderBottom: '1px solid var(--border)', paddingBottom: '4px', marginBottom: '4px' }}>
                        <div style={{ marginLeft: 180, position: 'relative', height: 22 }}>
                            {TIME_TICKS.map((t) => (
                                <span
                                    key={t.label}
                                    style={{
                                        position: 'absolute',
                                        left: `${pct(t.date)}%`,
                                        fontSize: '0.68rem',
                                        color: 'var(--text-muted)',
                                        transform: 'translateX(-50%)',
                                        whiteSpace: 'nowrap',
                                    }}
                                >{t.label}</span>
                            ))}
                        </div>
                    </div>

                    {/* 商品行 */}
                    {displayData.map((d) => {
                        const left = pct(d.firstDate)
                        const right = pct(d.lastDate)
                        const width = Math.max(right - left, 0.5)
                        const isSelected = selectedProduct === d.productName
                        return (
                            <div
                                key={d.productName}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    height: 22,
                                    cursor: 'pointer',
                                    background: isSelected ? 'rgba(59,130,246,0.08)' : 'transparent',
                                    borderRadius: 3,
                                }}
                                onClick={() => setSelectedProduct(isSelected ? null : d.productName)}
                                title={`${d.productName}\n${d.firstDate?.toISOString()?.slice(0, 10)} 〜 ${d.lastDate?.toISOString()?.slice(0, 10)}（${d.daysActive}日）\n売上: ${fmtLS(d.gross)}`}
                            >
                                {/* 商品名 */}
                                <div style={{
                                    width: 180, minWidth: 180, fontSize: '0.72rem', color: 'var(--text-secondary)',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    paddingRight: '6px', textAlign: 'right',
                                }}>
                                    {d.isNew && <span style={{ color: 'var(--accent-green)', marginRight: 2 }}>🆕</span>}
                                    {d.isDecline && !d.isNew && <span style={{ color: 'var(--accent-red)', marginRight: 2 }}>⚠</span>}
                                    {d.productName}
                                </div>
                                {/* バー */}
                                <div style={{ flex: 1, position: 'relative', height: 14 }}>
                                    <div style={{
                                        position: 'absolute',
                                        left: `${left}%`,
                                        width: `${width}%`,
                                        height: '100%',
                                        background: salesToColor(d.gross, maxGross),
                                        borderRadius: 3,
                                        border: isSelected ? '1px solid var(--accent-blue)' : '1px solid rgba(59,130,246,0.2)',
                                        transition: 'background 0.2s',
                                    }} />
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* 選択商品の月別推移 */}
                {selectedProduct && (() => {
                    const product = allData.find((d) => d.productName === selectedProduct)
                    if (!product) return null
                    return (
                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                                📈 {product.productName} — 月別売上
                            </div>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {product.monthlyData.map((m) => (
                                    <div key={m.yearMonth} style={{ textAlign: 'center', minWidth: 46 }}>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{m.yearMonth.slice(2)}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--accent-blue)', fontWeight: 600 }}>{(m.gross / 1000).toFixed(0)}K</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })()}
            </div>

            {/* サマリーセクション */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* ロングセラーTOP10 */}
                <div className="panel-section">
                    <div className="panel-title" style={{ marginBottom: '0.75rem' }}>🏅 ロングセラーTOP10（販売期間）</div>
                    <div className="data-table-wrap">
                        <table className="data-table">
                            <thead><tr><th>#</th><th>商品名</th><th style={{ textAlign: 'right' }}>販売日数</th><th style={{ textAlign: 'right' }}>売上</th></tr></thead>
                            <tbody>
                                {longSellers.map((d, i) => (
                                    <tr key={d.productName}>
                                        <td style={{ textAlign: 'center' }}>{i + 1}</td>
                                        <td style={{ fontSize: '0.78rem' }} title={d.productName}>{d.productName.slice(0, 28)}{d.productName.length > 28 ? '…' : ''}</td>
                                        <td style={{ textAlign: 'right' }}>{fmtNum(d.daysActive)}日</td>
                                        <td style={{ textAlign: 'right', fontSize: '0.78rem' }}>{fmtLS(d.gross)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* アラート・新商品 */}
                <div>
                    {/* 衰退兆候 */}
                    {declining.length > 0 && (
                        <div className="panel-section" style={{ marginBottom: '1rem' }}>
                            <div className="panel-title" style={{ marginBottom: '0.5rem' }}>⚠ 衰退兆候（直近3ヶ月で大幅減）</div>
                            {declining.map((d) => (
                                <div key={d.productName} className="alert-banner alert-banner-danger" style={{ marginBottom: '0.3rem', fontSize: '0.78rem' }}>
                                    {d.productName.slice(0, 30)} — 直近{fmtLS(d.recentGross)} / 前期{fmtLS(d.prevGross)}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 新商品 */}
                    {newItems.length > 0 && (
                        <div className="panel-section" style={{ marginBottom: '1rem' }}>
                            <div className="panel-title" style={{ marginBottom: '0.5rem' }}>🆕 新商品（直近2ヶ月で登場）</div>
                            {newItems.map((d) => (
                                <div key={d.productName} className="alert-banner alert-banner-warn" style={{ marginBottom: '0.3rem', fontSize: '0.78rem' }}>
                                    {d.productName.slice(0, 30)} — {d.firstDate?.toISOString()?.slice(0, 10)}〜
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 短命商品 */}
                    {shortLived.length > 0 && (
                        <div className="panel-section">
                            <div className="panel-title" style={{ marginBottom: '0.5rem' }}>⏱ 短命商品（6ヶ月以内に急落）</div>
                            {shortLived.map((d) => (
                                <div key={d.productName} className="tip-box" style={{ marginBottom: '0.3rem', fontSize: '0.78rem' }}>
                                    {d.productName.slice(0, 30)} — 価格・マーケティングの見直しを検討してください
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
