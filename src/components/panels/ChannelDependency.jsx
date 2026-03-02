/**
 * Marketplace依存率パネル（4.3）
 * ドーナツ：Marketplace + インワールド各Location別の売上内訳
 * 月別時系列折れ線＋アラート機能
 */
import { useMemo, useRef, useState } from 'react'
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
    LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine,
    BarChart, Bar,
} from 'recharts'
import { aggregateByLocation, aggregateByChannel, aggregateChannelByMonth, applyFilters, fmtLS, fmtNum } from '../../utils/dataHelpers'
import ExportBtn from '../shared/ExportBtn'

// Location別カラーパレット（Marketplace=青固定、場所名は順に割り当て）
const LOCATION_COLORS = [
    '#3b82f6', // Marketplace（固定）
    '#10b981', '#f59e0b', '#ec4899', '#8b5cf6',
    '#06b6d4', '#f97316', '#84cc16', '#64748b', '#ef4444',
    '#a78bfa', '#34d399', '#fb923c', '#38bdf8', '#fb7185',
]

function PieTooltip({ active, payload }) {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    return (
        <div className="custom-tooltip">
            <div className="custom-tooltip-label">{d.location}</div>
            <div className="custom-tooltip-item"><span>売上</span><span className="custom-tooltip-value">{fmtLS(d.gross)}</span></div>
            <div className="custom-tooltip-item"><span>件数</span><span className="custom-tooltip-value">{fmtNum(d.count)} 件</span></div>
            <div className="custom-tooltip-item"><span>構成比</span><span className="custom-tooltip-value">{d.pct?.toFixed(1)}%</span></div>
        </div>
    )
}

function LineTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    return (
        <div className="custom-tooltip">
            <div className="custom-tooltip-label">{label}</div>
            {payload.map((p) => (
                <div key={p.name} className="custom-tooltip-item">
                    <span style={{ color: p.color }}>{p.name}</span>
                    <span className="custom-tooltip-value">
                        {p.dataKey === 'dependencyPct' ? `${p.value?.toFixed(1)}%` : fmtLS(p.value)}
                    </span>
                </div>
            ))}
        </div>
    )
}

function AlertDot(props) {
    const { cx, cy, payload } = props
    if (payload?.dependencyPct >= 70) {
        return <circle cx={cx} cy={cy} r={5} fill="var(--accent-red)" stroke="none" />
    }
    return null
}

// カスタムラベル：パイが小さすぎる場合は非表示
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, pct, location }) {
    if (pct < 3) return null
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={600}>
            {pct.toFixed(1)}%
        </text>
    )
}

export default function ChannelDependency({ rows, filters }) {
    const panelRef = useRef()
    const [showInWorldDetail, setShowInWorldDetail] = useState(false)

    const { locationData, channelTotal, monthlyData } = useMemo(() => {
        if (!rows?.length) return { locationData: [], channelTotal: null, monthlyData: [] }
        const filtered = applyFilters(rows, filters)
        return {
            locationData: aggregateByLocation(filtered),
            channelTotal: aggregateByChannel(filtered),
            monthlyData: aggregateChannelByMonth(filtered),
        }
    }, [rows, filters])

    // Marketplace vs インワールド合計
    const marketplaceSummary = useMemo(() => {
        const mp = locationData.find((d) => d.isMarketplace)
        const inWorldItems = locationData.filter((d) => !d.isMarketplace)
        const inWorldGross = inWorldItems.reduce((s, d) => s + d.gross, 0)
        const inWorldCount = inWorldItems.reduce((s, d) => s + d.count, 0)
        const total = locationData.reduce((s, d) => s + d.gross, 0)
        return { mp, inWorldItems, inWorldGross, inWorldCount, total }
    }, [locationData])

    // ドーナツ用データ（外側：Marketplace vs インワールド合計、内側：全Location別）
    const outerPieData = useMemo(() => [
        {
            location: 'SL Marketplace',
            gross: marketplaceSummary.mp?.gross ?? 0,
            count: marketplaceSummary.mp?.count ?? 0,
            pct: marketplaceSummary.total > 0 ? ((marketplaceSummary.mp?.gross ?? 0) / marketplaceSummary.total) * 100 : 0,
        },
        {
            location: 'インワールド合計',
            gross: marketplaceSummary.inWorldGross,
            count: marketplaceSummary.inWorldCount,
            pct: marketplaceSummary.total > 0 ? (marketplaceSummary.inWorldGross / marketplaceSummary.total) * 100 : 0,
        },
    ], [marketplaceSummary])

    // インワールド場所別詳細データ（その他を束ねる）
    const inWorldDetail = useMemo(() => {
        const items = marketplaceSummary.inWorldItems
        const top = items.slice(0, 9)
        const rest = items.slice(9)
        if (rest.length === 0) return top
        return [
            ...top,
            { location: 'その他', gross: rest.reduce((s, d) => s + d.gross, 0), count: rest.reduce((s, d) => s + d.count, 0), pct: rest.reduce((s, d) => s + d.pct, 0), isOther: true },
        ]
    }, [marketplaceSummary])

    // 全Location別の詳細ドーナツ用データ（Marketplace + 場所別）
    const fullLocationPieData = useMemo(() => {
        const mp = locationData.filter((d) => d.isMarketplace)
        const inWorld = locationData.filter((d) => !d.isMarketplace)
        const top9 = inWorld.slice(0, 9)
        const rest = inWorld.slice(9)
        const result = [...mp, ...top9]
        if (rest.length > 0) {
            result.push({ location: 'その他', gross: rest.reduce((s, d) => s + d.gross, 0), count: rest.reduce((s, d) => s + d.count, 0), pct: rest.reduce((s, d) => s + d.pct, 0) })
        }
        return result
    }, [locationData])

    // トレンド（依存率）
    const isTrendRising = useMemo(() => {
        if (monthlyData.length < 6) return false
        const recent = monthlyData.slice(-3)
        const prev = monthlyData.slice(-6, -3)
        const recentAvg = recent.reduce((s, d) => s + d.dependencyPct, 0) / recent.length
        const prevAvg = prev.reduce((s, d) => s + d.dependencyPct, 0) / prev.length
        return recentAvg > prevAvg + 5
    }, [monthlyData])

    const csvRows = locationData.map((d) => [d.location, Math.round(d.gross), d.count, d.pct.toFixed(1)])

    return (
        <div ref={panelRef}>
            {isTrendRising && (
                <div className="alert-banner alert-banner-danger">
                    ⚠ SL Marketplace依存が高まっています。インワールド販売（CasperVend）の強化を検討してください。
                </div>
            )}

            {/* ドーナツ：2段階表示 */}
            <div className="panel-section">
                <div className="panel-header">
                    <div>
                        <div className="panel-title">🔗 販売チャネル別構成</div>
                        <div className="panel-sub">SL Marketplace vs インワールド（Location別内訳）</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            className={`tab-btn ${showInWorldDetail ? 'active' : ''}`}
                            onClick={() => setShowInWorldDetail((v) => !v)}
                            style={showInWorldDetail ? { color: 'var(--accent-green)', borderBottomColor: 'var(--accent-green)' } : {}}
                        >
                            {showInWorldDetail ? '📍 場所別表示中' : '📍 場所別を表示'}
                        </button>
                        <ExportBtn
                            panelRef={panelRef}
                            csvHeaders={['Location', '売上(L$)', '件数', '構成比(%)']}
                            csvRows={csvRows}
                            fileBaseName="channel-location"
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: showInWorldDetail ? '1fr 1fr' : '1fr 1fr', gap: '1.5rem' }}>
                    {/* 左：ドーナツ */}
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textAlign: 'center' }}>
                            {showInWorldDetail ? 'Location別売上構成比（全場所）' : 'Marketplace vs インワールド'}
                        </div>
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={showInWorldDetail ? fullLocationPieData : outerPieData}
                                    dataKey="gross"
                                    nameKey="location"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={showInWorldDetail ? 50 : 70}
                                    outerRadius={showInWorldDetail ? 110 : 110}
                                    labelLine={false}
                                    label={(props) => <PieLabel {...props} />}
                                >
                                    {(showInWorldDetail ? fullLocationPieData : outerPieData).map((d, i) => (
                                        <Cell
                                            key={d.location}
                                            fill={d.isMarketplace || d.location === 'SL Marketplace'
                                                ? LOCATION_COLORS[0]
                                                : LOCATION_COLORS[(i % (LOCATION_COLORS.length - 1)) + 1]}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip content={<PieTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>

                        {/* 概要行 */}
                        {!showInWorldDetail && outerPieData.map((d, i) => (
                            <div key={d.location} className="summary-item" style={{ marginTop: '0.4rem' }}>
                                <div className="summary-item-label" style={{ color: i === 0 ? LOCATION_COLORS[0] : LOCATION_COLORS[1] }}>{d.location}</div>
                                <div className="summary-item-value">{fmtLS(d.gross)} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>（{d.pct.toFixed(1)}%）</span></div>
                            </div>
                        ))}
                    </div>

                    {/* 右：月別依存率 or 場所別棒グラフ */}
                    <div>
                        {showInWorldDetail ? (
                            /* インワールド場所別横棒グラフ */
                            <div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>インワールド場所別売上（L$）</div>
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={inWorldDetail} layout="vertical" margin={{ top: 5, right: 70, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                                        <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                                        <YAxis type="category" dataKey="location" width={100} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} tickFormatter={(v) => v.length > 14 ? v.slice(0, 14) + '…' : v} />
                                        <Tooltip formatter={(v, name, { payload }) => [fmtLS(v), `${payload.location} (${payload.pct?.toFixed(1)}%)`]} />
                                        <Bar dataKey="gross" name="売上" radius={[0, 4, 4, 0]}>
                                            {inWorldDetail.map((d, i) => (
                                                <Cell key={d.location} fill={d.isOther ? 'var(--text-muted)' : LOCATION_COLORS[i % (LOCATION_COLORS.length - 1) + 1]} opacity={0.85} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            /* 月別依存率折れ線 */
                            <div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>SL Marketplace依存率 月別推移（🔴 = 70%超警告）</div>
                                <ResponsiveContainer width="100%" height={280}>
                                    <LineChart data={monthlyData} margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                        <XAxis dataKey="yearMonth" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} interval={3} angle={-30} textAnchor="end" height={40} />
                                        <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                                        <Tooltip content={<LineTooltip />} />
                                        <ReferenceLine y={70} stroke="var(--accent-red)" strokeDasharray="4 4" label={{ value: '70%', fill: 'var(--accent-red)', fontSize: 10, position: 'right' }} />
                                        <Line type="monotone" dataKey="dependencyPct" name="依存率（%）" stroke="var(--accent-blue)" strokeWidth={2} dot={<AlertDot />} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* インワールド場所別テーブル（常時表示） */}
            <div className="panel-section">
                <div className="panel-title" style={{ marginBottom: '0.75rem' }}>📍 Location別 売上内訳</div>
                <div className="data-table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Location</th>
                                <th style={{ textAlign: 'right' }}>売上（L$）</th>
                                <th style={{ textAlign: 'right' }}>件数</th>
                                <th style={{ textAlign: 'right' }}>構成比</th>
                                <th>種別</th>
                            </tr>
                        </thead>
                        <tbody>
                            {locationData.map((d, i) => (
                                <tr key={d.location}>
                                    <td style={{ textAlign: 'center' }}>{i + 1}</td>
                                    <td style={{ fontWeight: d.isMarketplace ? 700 : 400, color: d.isMarketplace ? LOCATION_COLORS[0] : 'inherit' }}>{d.location}</td>
                                    <td style={{ textAlign: 'right' }}>{fmtLS(d.gross)}</td>
                                    <td style={{ textAlign: 'right' }}>{fmtNum(d.count)}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                            <div style={{ width: 60, height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                                                <div style={{ width: `${Math.min(d.pct, 100)}%`, height: '100%', background: d.isMarketplace ? LOCATION_COLORS[0] : LOCATION_COLORS[(i % (LOCATION_COLORS.length - 1)) + 1], borderRadius: 3 }} />
                                            </div>
                                            <span style={{ minWidth: 40, textAlign: 'right' }}>{d.pct.toFixed(1)}%</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="badge" style={d.isMarketplace ? { background: 'rgba(59,130,246,0.15)', color: '#3b82f6' } : { background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                                            {d.isMarketplace ? '🛒 Marketplace' : '🏠 インワールド'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
