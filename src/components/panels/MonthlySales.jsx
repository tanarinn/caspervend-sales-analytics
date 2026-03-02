/**
 * 月別売上パネル（3.2）
 * 折れ線グラフ＋年×月のヒートマップ
 */
import { useMemo, useRef, useState } from 'react'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend,
} from 'recharts'
import { aggregateByMonth, buildHeatmapMatrix, applyFilters, fmtLS, fmtNum, fmtPct } from '../../utils/dataHelpers'
import DataTable from '../shared/DataTable'
import ExportBtn from '../shared/ExportBtn'

// 月名ラベル
const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

// ヒートマップセルのカラースケール
function heatColor(val, max) {
    if (!val || max === 0) return 'var(--bg-secondary)'
    const ratio = Math.min(val / max, 1)
    const alpha = 0.15 + ratio * 0.75
    return `rgba(59, 130, 246, ${alpha})`
}

// カスタムツールチップ
function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    return (
        <div className="custom-tooltip">
            <div className="custom-tooltip-label">{label}</div>
            {payload.map((p) => (
                <div key={p.name} className="custom-tooltip-item">
                    <span style={{ color: p.color }}>{p.name}</span>
                    <span className="custom-tooltip-value">{fmtLS(p.value)}</span>
                </div>
            ))}
        </div>
    )
}

const LINE_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)']

export default function MonthlySales({ rows, filters }) {
    const panelRef = useRef()
    const [selectedYear, setSelectedYear] = useState('all')

    const { monthData, heatmap, availableYears } = useMemo(() => {
        if (!rows?.length) return { monthData: [], heatmap: null, availableYears: [] }
        const filtered = applyFilters(rows, filters)
        const md = aggregateByMonth(filtered)
        const hm = buildHeatmapMatrix(md)
        return { monthData: md, heatmap: hm, availableYears: hm.years }
    }, [rows, filters])

    // 折れ線用データ：各年の月別売上を年ごとに列定義
    const lineData = useMemo(() => {
        const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
        const years = selectedYear === 'all' ? availableYears : [parseInt(selectedYear)]
        return months.map((m) => {
            const row = { month: MONTH_LABELS[m - 1] }
            for (const y of years) {
                const found = monthData.find((d) => d.year === y && d.month === m)
                row[String(y)] = found?.gross ?? null
            }
            return row
        })
    }, [monthData, selectedYear, availableYears])

    const yearOptions = ['all', ...availableYears.map(String)]

    // サマリー
    const summary = useMemo(() => {
        if (!monthData.length) return null
        const sorted = [...monthData].sort((a, b) => b.gross - a.gross)
        const avg = monthData.reduce((s, d) => s + d.gross, 0) / monthData.length
        return {
            maxMonth: sorted[0],
            minMonth: sorted[sorted.length - 1],
            avg,
        }
    }, [monthData])

    // テーブル
    const columns = [
        { key: 'yearMonth', label: '年月', align: 'center' },
        { key: 'gross', label: '売上（L$）', align: 'right', render: (v) => fmtLS(v) },
        { key: 'count', label: '取引件数', align: 'right', render: (v) => fmtNum(v) },
        { key: 'growthRate', label: '前月比', align: 'right', render: (v) => v != null ? fmtPct(v) : '—' },
    ]

    // ヒートマップの最大値
    const heatMax = useMemo(() => {
        if (!heatmap) return 1
        return Math.max(...Object.values(heatmap.matrix).flatMap((m) => Object.values(m)), 1)
    }, [heatmap])

    return (
        <div ref={panelRef}>
            {/* 折れ線グラフ */}
            <div className="panel-section">
                <div className="panel-header">
                    <div>
                        <div className="panel-title">📆 月別売上推移</div>
                        <div className="panel-sub">月別 Gross 売上（折れ線）</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <select className="filter-select" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} id="monthly-year-filter">
                            {yearOptions.map((y) => (
                                <option key={y} value={y}>{y === 'all' ? '全年度' : `${y}年`}</option>
                            ))}
                        </select>
                        <ExportBtn panelRef={panelRef} csvHeaders={['年月', '売上(L$)', '取引件数', '前月比(%)']} csvRows={monthData.map((d) => [d.yearMonth, Math.round(d.gross), d.count, d.growthRate?.toFixed(1) ?? ''])} fileBaseName="monthly-sales" />
                    </div>
                </div>

                <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={lineData} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }} />
                        {(selectedYear === 'all' ? availableYears : [parseInt(selectedYear)]).map((y, i) => (
                            <Line
                                key={y}
                                type="monotone"
                                dataKey={String(y)}
                                name={`${y}年`}
                                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                connectNulls
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* ヒートマップ */}
            {heatmap && (
                <div className="panel-section">
                    <div className="panel-title" style={{ marginBottom: '0.75rem' }}>🟦 ヒートマップ（年×月）</div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ borderCollapse: 'collapse', fontSize: '0.78rem', minWidth: 600, width: '100%' }}>
                            <thead>
                                <tr>
                                    <th style={{ padding: '4px 8px', color: 'var(--text-muted)', textAlign: 'left' }}>年</th>
                                    {MONTH_LABELS.map((m) => (
                                        <th key={m} style={{ padding: '4px 6px', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 500 }}>{m}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {heatmap.years.map((y) => (
                                    <tr key={y}>
                                        <td style={{ padding: '4px 8px', color: 'var(--text-secondary)', fontWeight: 600 }}>{y}</td>
                                        {heatmap.months.map((m) => {
                                            const val = heatmap.matrix[y]?.[m]
                                            return (
                                                <td
                                                    key={m}
                                                    title={val ? fmtLS(val) : '0'}
                                                    style={{
                                                        padding: '4px 6px',
                                                        textAlign: 'center',
                                                        background: heatColor(val, heatMax),
                                                        color: 'var(--text-primary)',
                                                        borderRadius: 3,
                                                        fontSize: '0.72rem',
                                                        cursor: 'default',
                                                    }}
                                                >
                                                    {val ? `${(val / 1000).toFixed(0)}K` : ''}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* サマリー */}
            {summary && (
                <div className="panel-section">
                    <div className="panel-title" style={{ marginBottom: '0.75rem' }}>📌 サマリー</div>
                    <div className="summary-cards">
                        <div className="summary-item">
                            <div className="summary-item-label">🏆 最高月</div>
                            <div className="summary-item-value">{summary.maxMonth.yearMonth}（{fmtLS(summary.maxMonth.gross)}）</div>
                        </div>
                        <div className="summary-item">
                            <div className="summary-item-label">📉 最低月</div>
                            <div className="summary-item-value">{summary.minMonth.yearMonth}（{fmtLS(summary.minMonth.gross)}）</div>
                        </div>
                        <div className="summary-item">
                            <div className="summary-item-label">📊 月平均売上</div>
                            <div className="summary-item-value">{fmtLS(summary.avg)}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* データテーブル */}
            <div className="panel-section">
                <div className="panel-title" style={{ marginBottom: '0.75rem' }}>📋 月別データ一覧</div>
                <DataTable columns={columns} data={[...monthData].reverse()} pageSize={20} id="monthly-table" />
            </div>
        </div>
    )
}
