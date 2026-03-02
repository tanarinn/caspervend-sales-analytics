/**
 * 価格帯ゾーン分解パネル（4.1）
 * ドーナツグラフ（構成比）＋棒グラフ（件数vs金額）
 */
import { useMemo, useRef, useState } from 'react'
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { aggregateByPriceZone, applyFilters, fmtLS, fmtNum } from '../../utils/dataHelpers'
import ExportBtn from '../shared/ExportBtn'

// デフォルトゾーン定義
const DEFAULT_ZONES = [
    { name: 'エントリー', min: 1, max: 99, color: 'var(--chart-3)' },
    { name: 'ミドル低', min: 100, max: 299, color: 'var(--chart-2)' },
    { name: 'ミドル高', min: 300, max: 599, color: 'var(--chart-1)' },
    { name: 'プレミアム', min: 600, max: 999, color: 'var(--chart-5)' },
    { name: 'ハイエンド', min: 1000, max: Infinity, color: 'var(--chart-6)' },
]

const ZONE_COLORS_STATIC = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899']

function CustomTooltip({ active, payload }) {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    return (
        <div className="custom-tooltip">
            <div className="custom-tooltip-label">{d.name}</div>
            <div className="custom-tooltip-item"><span>売上</span><span className="custom-tooltip-value">{fmtLS(d.gross)}</span></div>
            <div className="custom-tooltip-item"><span>構成比</span><span className="custom-tooltip-value">{d.pct?.toFixed(1)}%</span></div>
            <div className="custom-tooltip-item"><span>件数</span><span className="custom-tooltip-value">{fmtNum(d.count)} 件</span></div>
        </div>
    )
}

export default function PriceZone({ rows, filters }) {
    const panelRef = useRef()
    const [zones, setZones] = useState(DEFAULT_ZONES)
    const [showSetting, setShowSetting] = useState(false)
    const [editZones, setEditZones] = useState(DEFAULT_ZONES)

    const zoneData = useMemo(() => {
        if (!rows?.length) return []
        const filtered = applyFilters(rows, filters)
        return aggregateByPriceZone(filtered, zones)
    }, [rows, filters, zones])

    const applyZones = () => {
        setZones(editZones.map((z, i) => ({ ...z, color: DEFAULT_ZONES[i]?.color || 'var(--chart-1)' })))
        setShowSetting(false)
    }

    return (
        <div ref={panelRef}>
            {/* ドーナツグラフ */}
            <div className="panel-section">
                <div className="panel-header">
                    <div>
                        <div className="panel-title">💰 価格帯ゾーン分解</div>
                        <div className="panel-sub">ゾーン別 売上構成比（ドーナツ）と件数比較（棒グラフ）</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="export-btn" onClick={() => setShowSetting(!showSetting)}>⚙ ゾーン設定</button>
                        <ExportBtn panelRef={panelRef} csvHeaders={['ゾーン', '売上(L$)', '件数', '構成比(%)']} csvRows={zoneData.map((d) => [d.name, Math.round(d.gross), d.count, d.pct.toFixed(1)])} fileBaseName="price-zone" />
                    </div>
                </div>

                {/* ゾーン設定パネル */}
                {showSetting && (
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1rem', marginBottom: '1rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', fontSize: '0.85rem' }}>価格帯しきい値を編集</div>
                        {editZones.map((z, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                                <span style={{ width: 80, color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{z.name}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>下限</span>
                                <input type="number" value={z.min === 1 ? 0 : z.min} onChange={(e) => { const v = parseInt(e.target.value) || 0; setEditZones((prev) => prev.map((ez, j) => j === i ? { ...ez, min: v === 0 ? 1 : v } : ez)) }}
                                    style={{ width: 70, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '0.25rem 0.4rem', borderRadius: 4, fontSize: '0.8rem' }} />
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>上限</span>
                                <input type="number" value={z.max === Infinity ? '' : z.max} placeholder="∞" onChange={(e) => { const v = parseInt(e.target.value); setEditZones((prev) => prev.map((ez, j) => j === i ? { ...ez, max: isNaN(v) ? Infinity : v } : ez)) }}
                                    style={{ width: 70, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '0.25rem 0.4rem', borderRadius: 4, fontSize: '0.8rem' }} />
                            </div>
                        ))}
                        <button onClick={applyZones} style={{ marginTop: '0.5rem', padding: '0.3rem 0.8rem', background: 'var(--accent-blue)', border: 'none', borderRadius: 4, color: 'white', cursor: 'pointer', fontSize: '0.82rem' }}>適用</button>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    {/* ドーナツ */}
                    <div>
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie data={zoneData} dataKey="gross" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100}>
                                    {zoneData.map((_, i) => <Cell key={i} fill={ZONE_COLORS_STATIC[i % ZONE_COLORS_STATIC.length]} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--text-secondary)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {/* 棒グラフ */}
                    <div>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={zoneData} margin={{ top: 10, right: 40, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                                <YAxis yAxisId="left" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar yAxisId="left" dataKey="gross" name="売上（L$）" fill="var(--accent-blue)" radius={[3, 3, 0, 0]} opacity={0.85} />
                                <Bar yAxisId="right" dataKey="count" name="件数" fill="var(--accent-yellow)" radius={[3, 3, 0, 0]} opacity={0.75} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ゾーン別サマリーテーブル */}
                <div className="data-table-wrap" style={{ marginTop: '1rem' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ゾーン</th>
                                <th>価格帯（L$）</th>
                                <th style={{ textAlign: 'right' }}>売上</th>
                                <th style={{ textAlign: 'right' }}>件数</th>
                                <th style={{ textAlign: 'right' }}>構成比</th>
                                <th>戦略的位置</th>
                            </tr>
                        </thead>
                        <tbody>
                            {zoneData.map((d, i) => (
                                <tr key={d.name}>
                                    <td><span className="badge" style={{ background: ZONE_COLORS_STATIC[i] + '33', color: ZONE_COLORS_STATIC[i] }}>{d.name}</span></td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                                        {zones[i]?.min === 1 ? '0' : zones[i]?.min} 〜 {zones[i]?.max === Infinity ? '∞' : zones[i]?.max} L$
                                    </td>
                                    <td style={{ textAlign: 'right' }}>{fmtLS(d.gross)}</td>
                                    <td style={{ textAlign: 'right' }}>{fmtNum(d.count)} 件</td>
                                    <td style={{ textAlign: 'right' }}>{d.pct.toFixed(1)}%</td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                        {['集客・認知獲得', '量販・ライト層', '主力・バランス帯', 'コア収益源 ★', '高付加価値'][i]}
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
