/**
 * 年別売上パネル（3.1）
 * 棒グラフ（売上）＋折れ線（前年比%）の複合チャート
 */
import { useMemo, useRef } from 'react'
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, ReferenceLine,
    LabelList,
} from 'recharts'
import { aggregateByYear, calcCAGR, applyFilters, fmtLS, fmtNum, fmtPct } from '../../utils/dataHelpers'
import DataTable from '../shared/DataTable'
import ExportBtn from '../shared/ExportBtn'

// カスタムツールチップ
function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    return (
        <div className="custom-tooltip">
            <div className="custom-tooltip-label">{label}年</div>
            {payload.map((p) => (
                <div key={p.name} className="custom-tooltip-item">
                    <span style={{ color: p.color }}>{p.name}</span>
                    <span className="custom-tooltip-value">
                        {p.name === '前年比（%）'
                            ? p.value != null ? fmtPct(p.value) : '—'
                            : fmtLS(p.value)}
                    </span>
                </div>
            ))}
        </div>
    )
}

export default function YearlySales({ rows, filters }) {
    const panelRef = useRef()

    const data = useMemo(() => {
        if (!rows?.length) return []
        const filtered = applyFilters(rows, filters)
        return aggregateByYear(filtered).map((d) => ({
            ...d,
            is2026Partial: d.year === 2026, // 年途中データフラグ
        }))
    }, [rows, filters])

    const cagr = useMemo(() => calcCAGR(data), [data])
    const maxYear = data.reduce((best, d) => (!best || d.gross > best.gross ? d : best), null)
    const minYear = data.reduce((best, d) => (!best || d.gross < best.gross ? d : best), null)

    // テーブル列定義
    const columns = [
        { key: 'year', label: '年', align: 'center', render: (v, row) => `${v}${row.is2026Partial ? ' *' : ''}` },
        { key: 'gross', label: '売上（L$）', align: 'right', render: (v) => fmtLS(v) },
        { key: 'count', label: '取引件数', align: 'right', render: (v) => fmtNum(v) },
        { key: 'growthRate', label: '前年比', align: 'right', render: (v) => v != null ? fmtPct(v) : '—' },
        { key: 'avgPrice', label: '客単価', align: 'right', render: (v) => fmtLS(v) },
    ]

    const csvHeaders = ['年', '売上(L$)', '取引件数', '前年比(%)', '客単価(L$)']
    const csvRows = data.map((d) => [
        `${d.year}${d.is2026Partial ? '(*3月まで)' : ''}`,
        Math.round(d.gross),
        d.count,
        d.growthRate?.toFixed(1) ?? '',
        Math.round(d.avgPrice),
    ])

    return (
        <div ref={panelRef}>
            {/* メイングラフ */}
            <div className="panel-section">
                <div className="panel-header">
                    <div>
                        <div className="panel-title">📅 年別売上（複合チャート）</div>
                        <div className="panel-sub">棒グラフ：売上（L$）／折れ線：前年比成長率（%）</div>
                    </div>
                    <ExportBtn panelRef={panelRef} csvHeaders={csvHeaders} csvRows={csvRows} fileBaseName="yearly-sales" />
                </div>

                <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={data} margin={{ top: 10, right: 50, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis
                            dataKey="year"
                            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                            tickFormatter={(v) => `${v}${data.find((d) => d.year === v)?.is2026Partial ? '*' : ''}`}
                        />
                        <YAxis
                            yAxisId="left"
                            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                            tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                            label={{ value: '売上 (L$)', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 11, offset: -5 }}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                            tickFormatter={(v) => `${v?.toFixed(0)}%`}
                            label={{ value: '前年比 (%)', angle: 90, position: 'insideRight', fill: 'var(--text-muted)', fontSize: 11, offset: 10 }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }} />
                        <ReferenceLine yAxisId="right" y={0} stroke="var(--border-light)" strokeDasharray="4 4" />
                        <Bar yAxisId="left" dataKey="gross" name="売上（L$）" fill="var(--accent-blue)" radius={[4, 4, 0, 0]} opacity={0.85} />
                        <Line yAxisId="right" dataKey="growthRate" name="前年比（%）" stroke="var(--accent-yellow)" strokeWidth={2.5} dot={{ fill: 'var(--accent-yellow)', r: 5 }} connectNulls />
                    </ComposedChart>
                </ResponsiveContainer>
                <div className="tip-box">💡 2026年は3月分までのデータです（年途中）。前年比の計算には含まれますが参考値として扱ってください。</div>
            </div>

            {/* サマリーカード */}
            <div className="panel-section">
                <div className="panel-title">📌 サマリー</div>
                <div className="summary-cards" style={{ marginTop: '0.75rem' }}>
                    <div className="summary-item">
                        <div className="summary-item-label">🏆 最高売上年</div>
                        <div className="summary-item-value">{maxYear ? `${maxYear.year}年（${fmtLS(maxYear.gross)}）` : '—'}</div>
                    </div>
                    <div className="summary-item">
                        <div className="summary-item-label">📉 最低売上年</div>
                        <div className="summary-item-value">{minYear ? `${minYear.year}年（${fmtLS(minYear.gross)}）` : '—'}</div>
                    </div>
                    <div className="summary-item">
                        <div className="summary-item-label">📈 CAGR（年平均成長率）</div>
                        <div className="summary-item-value">{cagr != null ? `${cagr.toFixed(1)}%` : '—'}</div>
                    </div>
                </div>
            </div>

            {/* データテーブル */}
            <div className="panel-section">
                <div className="panel-title" style={{ marginBottom: '0.75rem' }}>📋 年別データ一覧 <small style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.75rem' }}>（* = 年途中）</small></div>
                <DataTable columns={columns} data={data} pageSize={10} id="yearly-table" />
            </div>
        </div>
    )
}
