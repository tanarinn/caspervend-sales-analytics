/**
 * DEMO効果分析パネル
 * DEMOダウンロードが有償売上に与える影響を推定し、
 * DEMOあり/なし商品の平均売上・販売数を比較する
 */
import { useMemo, useRef, useState } from 'react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, ComposedChart, Line, Legend,
    ScatterChart, Scatter, ReferenceLine,
} from 'recharts'
import { buildDemoEffectData, applyFilters, fmtLS, fmtNum } from '../../utils/dataHelpers'
import ExportBtn from '../shared/ExportBtn'

const GROUP_COLORS = {
    withDemo: '#10b981',   // 緑：DEMOあり
    withoutDemo: '#64748b', // グレー：DEMOなし
    demoOnly: '#f59e0b',   // 黄：DEMOのみ
}

function CompareTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    return (
        <div className="custom-tooltip">
            <div className="custom-tooltip-label">{label}</div>
            {payload.map((p) => (
                <div key={p.name} className="custom-tooltip-item">
                    <span style={{ color: p.fill }}>{p.name}</span>
                    <span className="custom-tooltip-value">{p.name.includes('売上') ? fmtLS(p.value) : `${fmtNum(p.value)} 件`}</span>
                </div>
            ))}
        </div>
    )
}

function MonthlyTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    return (
        <div className="custom-tooltip">
            <div className="custom-tooltip-label">{label}</div>
            {payload.map((p) => (
                <div key={p.name} className="custom-tooltip-item">
                    <span style={{ color: p.color ?? p.fill }}>{p.name}</span>
                    <span className="custom-tooltip-value">
                        {p.name.includes('DEMO') ? `${fmtNum(p.value)} DL` : p.name.includes('売上') ? fmtLS(p.value) : `${fmtNum(p.value)} 件`}
                    </span>
                </div>
            ))}
        </div>
    )
}

export default function DemoEffect({ rows, filters }) {
    const panelRef = useRef()
    const [tab, setTab] = useState('compare')  // 'compare' | 'monthly' | 'products'
    const [mpOnly, setMpOnly] = useState(false)  // trueのときMarketplaceのみで有償集計

    const data = useMemo(() => {
        if (!rows?.length) return null
        // DEMO行も含めてフィルタ（excludeDemo=false）
        // ただし有償側はmpOnlyトグルに応じてlocationを追加フィルタ
        const baseFiltered = applyFilters(rows, { ...filters, excludeDemo: false })
        const rowsForCalc = mpOnly
            ? baseFiltered.map((r) => {
                // DEMOはそのまま、有償はMarketplaceのみ有効に
                if (r.isPaid && r.location !== 'SL Marketplace') {
                    return { ...r, isPaid: false, paidGross: 0 }
                }
                return r
            })
            : baseFiltered
        return buildDemoEffectData(rowsForCalc)
    }, [rows, filters, mpOnly])

    if (!data) return null
    const { comparison, monthlyDemoVsPaid, withDemo, withoutDemo, demoOnlyProducts } = data

    // 比較棒グラフ用データ
    const grossCompare = [
        { name: 'DEMOあり', value: comparison.avgGrossWithDemo, fill: GROUP_COLORS.withDemo },
        { name: 'DEMOなし', value: comparison.avgGrossWithoutDemo, fill: GROUP_COLORS.withoutDemo },
    ]
    const countCompare = [
        { name: 'DEMOあり', value: comparison.avgPaidCountWithDemo, fill: GROUP_COLORS.withDemo },
        { name: 'DEMOなし', value: comparison.avgPaidCountWithoutDemo, fill: GROUP_COLORS.withoutDemo },
    ]

    // 倍率
    const grossRatio = comparison.avgGrossWithoutDemo > 0
        ? (comparison.avgGrossWithDemo / comparison.avgGrossWithoutDemo).toFixed(1) : '—'
    const countRatio = comparison.avgPaidCountWithoutDemo > 0
        ? (comparison.avgPaidCountWithDemo / comparison.avgPaidCountWithoutDemo).toFixed(1) : '—'

    const csvRows = data.products.map((p) => [
        p.demoCount > 0 && p.paidGross > 0 ? 'DEMOあり' : p.demoCount > 0 ? 'DEMOのみ' : 'DEMOなし',
        p.productName, p.demoCount, Math.round(p.paidGross), p.paidCount,
    ])

    return (
        <div ref={panelRef}>
            {/* ヘッダー */}
            <div className="panel-section">
                <div className="panel-header">
                    <div>
                        <div className="panel-title">🧪 DEMO効果分析（β）</div>
                        <div className="panel-sub">
                            DEMOダウンロードが売上に与える影響を推定する
                            {mpOnly && <span style={{ marginLeft: '0.5rem', color: 'var(--accent-blue)', fontWeight: 600 }}>｜🛒 Marketplace集計中</span>}
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {/* Marketplaceのみフィルタートグル */}
                        <label
                            className="filter-toggle"
                            style={{ cursor: 'pointer' }}
                            title="ONにすると有償売上・件数をMarketplace（SL Marketplace）のみで集計します"
                        >
                            <div
                                className={`toggle-switch ${mpOnly ? 'on' : ''}`}
                                onClick={() => setMpOnly((v) => !v)}
                            />
                            <span style={{ fontSize: '0.78rem', color: mpOnly ? 'var(--accent-blue)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                🛒 Marketplaceのみ
                            </span>
                        </label>
                        <ExportBtn
                            panelRef={panelRef}
                            csvHeaders={['グループ', '商品名', 'DEMO DL数', '有償売上(L$)', '有償件数']}
                            csvRows={csvRows}
                            fileBaseName="demo-effect"
                        />
                    </div>
                </div>

                {/* 商品数サマリーカード */}
                <div className="summary-cards" style={{ marginBottom: '1rem' }}>
                    <div className="summary-item" style={{ borderLeft: `3px solid ${GROUP_COLORS.withDemo}` }}>
                        <div className="summary-item-label" style={{ color: GROUP_COLORS.withDemo }}>🧪 DEMOあり商品（有償あり）</div>
                        <div className="summary-item-value">{fmtNum(comparison.withDemoCount)} 商品</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>平均DEMO DL: {comparison.avgDemoCount.toFixed(1)} 件/商品</div>
                    </div>
                    <div className="summary-item" style={{ borderLeft: `3px solid ${GROUP_COLORS.withoutDemo}` }}>
                        <div className="summary-item-label" style={{ color: GROUP_COLORS.withoutDemo }}>📦 DEMOなし商品</div>
                        <div className="summary-item-value">{fmtNum(comparison.withoutDemoCount)} 商品</div>
                    </div>
                    <div className="summary-item" style={{ borderLeft: `3px solid ${GROUP_COLORS.demoOnly}` }}>
                        <div className="summary-item-label" style={{ color: GROUP_COLORS.demoOnly }}>🆓 DEMOのみ（有償なし）</div>
                        <div className="summary-item-value">{fmtNum(comparison.demoOnlyCount)} 商品</div>
                    </div>
                </div>

                {/* タブ切り替え */}
                <div className="tab-bar">
                    <button className={`tab-btn ${tab === 'compare' ? 'active' : ''}`} onClick={() => setTab('compare')}>📊 DEMOあり/なし比較</button>
                    <button className={`tab-btn ${tab === 'monthly' ? 'active' : ''}`} onClick={() => setTab('monthly')}>📅 月別DEMO vs 有償推移</button>
                    <button className={`tab-btn ${tab === 'products' ? 'active' : ''}`} onClick={() => setTab('products')}>📋 商品一覧</button>
                </div>
            </div>

            {/* ---- 比較タブ ---- */}
            {tab === 'compare' && (
                <>
                    {/* 強調メッセージ */}
                    <div className="panel-section">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="tip-box" style={{ borderLeft: `3px solid ${GROUP_COLORS.withDemo}` }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: GROUP_COLORS.withDemo, marginBottom: '0.3rem' }}>💰 平均売上の比較</div>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>DEMOあり</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: GROUP_COLORS.withDemo }}>{fmtLS(comparison.avgGrossWithDemo)}</div>
                                    </div>
                                    <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>vs</div>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>DEMOなし</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: GROUP_COLORS.withoutDemo }}>{fmtLS(comparison.avgGrossWithoutDemo)}</div>
                                    </div>
                                    <div style={{ marginBottom: '0.3rem' }}>
                                        <span style={{ background: 'rgba(16,185,129,0.15)', color: GROUP_COLORS.withDemo, padding: '2px 8px', borderRadius: 99, fontSize: '1rem', fontWeight: 700 }}>
                                            {grossRatio}×
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="tip-box" style={{ borderLeft: `3px solid #3b82f6` }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#3b82f6', marginBottom: '0.3rem' }}>🔄 平均販売件数（回転数）の比較</div>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>DEMOあり</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: GROUP_COLORS.withDemo }}>{comparison.avgPaidCountWithDemo.toFixed(1)} 件</div>
                                    </div>
                                    <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>vs</div>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>DEMOなし</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: GROUP_COLORS.withoutDemo }}>{comparison.avgPaidCountWithoutDemo.toFixed(1)} 件</div>
                                    </div>
                                    <div style={{ marginBottom: '0.3rem' }}>
                                        <span style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', padding: '2px 8px', borderRadius: 99, fontSize: '1rem', fontWeight: 700 }}>
                                            {countRatio}×
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: '⚠️ 注意', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                        </div>
                        <div className="alert-banner alert-banner-warn" style={{ marginTop: '0.75rem', fontSize: '0.78rem' }}>
                            ⚠️ 相関は因果ではありません。DEMOを用意している商品は元々人気・品質が高い可能性があります。単純に「DEMOを追加すれば売上が上がる」とは断言できません。ただし傾向の差は顕著です。
                        </div>
                    </div>

                    {/* 棒グラフ比較 */}
                    <div className="panel-section">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            {/* 平均売上 */}
                            <div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>商品1点あたり平均売上（L$）</div>
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={grossCompare} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                        <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                                        <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                                        <Tooltip content={<CompareTooltip />} />
                                        <Bar dataKey="value" name="平均売上（L$）" radius={[4, 4, 0, 0]}>
                                            {grossCompare.map((d) => <Cell key={d.name} fill={d.fill} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            {/* 平均販売件数 */}
                            <div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>商品1点あたり平均販売件数（回転数）</div>
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={countCompare} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                        <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                                        <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                                        <Tooltip content={<CompareTooltip />} />
                                        <Bar dataKey="value" name="平均販売件数" radius={[4, 4, 0, 0]}>
                                            {countCompare.map((d) => <Cell key={d.name} fill={d.fill} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* DEMOあり商品リスト */}
                    <div className="panel-section">
                        <div className="panel-title" style={{ marginBottom: '0.75rem' }}>🧪 DEMOを用意している商品（有償あり）</div>
                        <div className="data-table-wrap">
                            <table className="data-table">
                                <thead><tr><th>#</th><th>商品名</th><th style={{ textAlign: 'right' }}>DEMO DL数</th><th style={{ textAlign: 'right' }}>有償売上</th><th style={{ textAlign: 'right' }}>有償件数</th></tr></thead>
                                <tbody>
                                    {withDemo.map((p, i) => (
                                        <tr key={p.productName}>
                                            <td style={{ textAlign: 'center' }}>{i + 1}</td>
                                            <td title={p.productName} style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.productName}</td>
                                            <td style={{ textAlign: 'right' }}><span className="badge badge-yellow">{fmtNum(p.demoCount)} DL</span></td>
                                            <td style={{ textAlign: 'right' }}>{fmtLS(p.paidGross)}</td>
                                            <td style={{ textAlign: 'right' }}>{fmtNum(p.paidCount)} 件</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* ---- 月別推移タブ ---- */}
            {tab === 'monthly' && (
                <div className="panel-section">
                    <div className="panel-title" style={{ marginBottom: '0.75rem' }}>📅 月別 DEMO DL数 vs 有償件数・売上推移</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                        DEMOのダウンロードが翌月以降の有償売上に先行するかを確認できます。
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <ComposedChart data={monthlyDemoVsPaid} margin={{ top: 5, right: 50, left: 10, bottom: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="yearMonth" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
                            <YAxis yAxisId="left" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                            <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                            <Tooltip content={<MonthlyTooltip />} />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                            <Bar yAxisId="left" dataKey="demoCount" name="DEMO DL数" fill={GROUP_COLORS.demoOnly} opacity={0.7} radius={[2, 2, 0, 0]} />
                            <Line yAxisId="left" type="monotone" dataKey="paidCount" name="有償件数" stroke={GROUP_COLORS.withDemo} strokeWidth={2} dot={false} />
                            <Line yAxisId="right" type="monotone" dataKey="paidGross" name="有償売上(L$)" stroke="#3b82f6" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* ---- 商品一覧タブ ---- */}
            {tab === 'products' && (
                <div className="panel-section">
                    <div className="panel-title" style={{ marginBottom: '0.75rem' }}>📋 全商品 DEMO・有償データ一覧</div>
                    <div className="data-table-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>グループ</th>
                                    <th>商品名</th>
                                    <th style={{ textAlign: 'right' }}>DEMO DL数</th>
                                    <th style={{ textAlign: 'right' }}>有償売上</th>
                                    <th style={{ textAlign: 'right' }}>有償件数</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.products.map((p) => {
                                    const grp = p.demoCount > 0 && p.paidGross > 0 ? 'withDemo'
                                        : p.demoCount > 0 && p.paidGross === 0 ? 'demoOnly'
                                            : 'withoutDemo'
                                    const labels = { withDemo: '🧪 DEMOあり', demoOnly: '🆓 DEMOのみ', withoutDemo: '📦 DEMOなし' }
                                    return (
                                        <tr key={p.productName}>
                                            <td>
                                                <span className="badge" style={{ background: GROUP_COLORS[grp] + '22', color: GROUP_COLORS[grp] }}>
                                                    {labels[grp]}
                                                </span>
                                            </td>
                                            <td title={p.productName} style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.productName}</td>
                                            <td style={{ textAlign: 'right' }}>{p.demoCount > 0 ? <span className="badge badge-yellow">{fmtNum(p.demoCount)} DL</span> : '—'}</td>
                                            <td style={{ textAlign: 'right' }}>{p.paidGross > 0 ? fmtLS(p.paidGross) : '—'}</td>
                                            <td style={{ textAlign: 'right' }}>{p.paidCount > 0 ? fmtNum(p.paidCount) : '—'}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
