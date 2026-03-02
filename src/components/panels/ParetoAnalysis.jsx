/**
 * パレート分析パネル（4.4）
 * 棒グラフ（売上）＋折れ線（累積%）の複合チャート
 * A/B/C群の色分け＋アクションコメント
 */
import { useMemo, useRef } from 'react'
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Cell, Legend,
} from 'recharts'
import { buildLongTailData, applyFilters, fmtLS, fmtNum } from '../../utils/dataHelpers'
import ExportBtn from '../shared/ExportBtn'

// A/B/C群カラー
const GROUP_COLORS = { A: '#3b82f6', B: '#f59e0b', C: '#64748b' }

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    return (
        <div className="custom-tooltip">
            <div className="custom-tooltip-label">#{label} {d?.productName?.slice(0, 25)}</div>
            <div className="custom-tooltip-item"><span>売上</span><span className="custom-tooltip-value">{fmtLS(d?.gross)}</span></div>
            <div className="custom-tooltip-item"><span>累積構成比</span><span className="custom-tooltip-value">{d?.cumulativePct?.toFixed(1)}%</span></div>
            <div className="custom-tooltip-item"><span>グループ</span><span className="custom-tooltip-value" style={{ color: GROUP_COLORS[d?.group] }}>{d?.group}群</span></div>
        </div>
    )
}

export default function ParetoAnalysis({ rows, filters }) {
    const panelRef = useRef()

    const data = useMemo(() => {
        if (!rows?.length) return []
        const filtered = applyFilters(rows, filters)
        return buildLongTailData(filtered)
    }, [rows, filters])

    const summary = useMemo(() => {
        if (!data.length) return null
        const totalGross = data.reduce((s, d) => s + d.gross, 0)
        const groups = { A: [], B: [], C: [] }
        for (const d of data) groups[d.group].push(d)
        return {
            total: data.length,
            totalGross,
            groups,
            top20pctCount: Math.ceil(data.length * 0.2),
            top20pctGross: data.slice(0, Math.ceil(data.length * 0.2)).reduce((s, d) => s + d.gross, 0),
        }
    }, [data])

    // アクションコメント
    const actionComments = useMemo(() => {
        if (!summary) return []
        const comments = []
        const aRate = summary.totalGross > 0 ? (summary.groups.A.reduce((s, d) => s + d.gross, 0) / summary.totalGross) * 100 : 0
        if (summary.groups.A.length > 0) {
            comments.push(`📌 Aランク商品（${summary.groups.A.length}商品）は売上の${aRate.toFixed(0)}%を占めます。在庫切れ・廃版にしないよう注意が必要です。`)
        }
        if (summary.groups.C.length > 0) {
            comments.push(`💡 Cランク商品（${summary.groups.C.length}商品）は売上貢献が低めです。価格・マーケティングの見直しを検討してください。`)
        }
        const top20Rate = summary.totalGross > 0 ? (summary.top20pctGross / summary.totalGross) * 100 : 0
        comments.push(`📊 上位${Math.ceil(summary.total * 0.2)}商品（上位20%）が全売上の${top20Rate.toFixed(1)}%を生み出しています。`)
        return comments
    }, [summary])

    return (
        <div ref={panelRef}>
            <div className="panel-section">
                <div className="panel-header">
                    <div>
                        <div className="panel-title">📊 パレート分析（上位20%の売上分布）</div>
                        <div className="panel-sub">棒グラフ：売上高 / 折れ線：累積構成比（%）</div>
                    </div>
                    <ExportBtn panelRef={panelRef} csvHeaders={['順位', '商品名', '売上(L$)', '累積(%)', 'グループ']} csvRows={data.map((d) => [d.rank, d.productName, Math.round(d.gross), d.cumulativePct.toFixed(1), d.group])} fileBaseName="pareto" />
                </div>

                {/* グラフ */}
                <ResponsiveContainer width="100%" height={350}>
                    <ComposedChart data={data} margin={{ top: 10, right: 50, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="rank" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} label={{ value: '商品ランク', position: 'insideBottomRight', fill: 'var(--text-muted)', fontSize: 10, offset: -5 }} />
                        <YAxis yAxisId="left" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                        <Tooltip content={<CustomTooltip />} />
                        {/* 参照線 */}
                        <ReferenceLine yAxisId="right" y={80} stroke="var(--accent-red)" strokeDasharray="4 4" label={{ value: '80%', fill: 'var(--accent-red)', fontSize: 10, position: 'right' }} />
                        <ReferenceLine yAxisId="right" y={95} stroke="var(--accent-yellow)" strokeDasharray="4 4" label={{ value: '95%', fill: 'var(--accent-yellow)', fontSize: 10, position: 'right' }} />
                        {/* 棒グラフ（A/B/C群で色分け） */}
                        <Bar yAxisId="left" dataKey="gross" name="売上（L$）" radius={[2, 2, 0, 0]}>
                            {data.map((d, i) => <Cell key={i} fill={GROUP_COLORS[d.group]} opacity={0.85} />)}
                        </Bar>
                        {/* 累積折れ線 */}
                        <Line yAxisId="right" type="monotone" dataKey="cumulativePct" name="累積構成比（%）" stroke="white" strokeWidth={2} dot={false} />
                    </ComposedChart>
                </ResponsiveContainer>

                {/* 凡例 */}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', justifyContent: 'center' }}>
                    {Object.entries(GROUP_COLORS).map(([g, c]) => (
                        <span key={g} style={{ fontSize: '0.78rem', color: c }}>
                            ■ {g}群（累積{g === 'A' ? '〜80%' : g === 'B' ? '80〜95%' : '95%〜'}）
                        </span>
                    ))}
                </div>
            </div>

            {/* サマリーテーブル */}
            {summary && (
                <div className="panel-section">
                    <div className="panel-title" style={{ marginBottom: '0.75rem' }}>📌 A/B/C群 別サマリー</div>
                    <div className="data-table-wrap">
                        <table className="data-table">
                            <thead><tr><th>グループ</th><th>条件</th><th style={{ textAlign: 'right' }}>商品数</th><th style={{ textAlign: 'right' }}>売上合計</th><th style={{ textAlign: 'right' }}>貢献率</th></tr></thead>
                            <tbody>
                                {['A', 'B', 'C'].map((g) => {
                                    const group = summary.groups[g]
                                    const gross = group.reduce((s, d) => s + d.gross, 0)
                                    const pct = summary.totalGross > 0 ? (gross / summary.totalGross) * 100 : 0
                                    return (
                                        <tr key={g}>
                                            <td><span className="badge" style={{ background: GROUP_COLORS[g] + '33', color: GROUP_COLORS[g] }}>{g}群</span></td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{g === 'A' ? '累積〜80%' : g === 'B' ? '80〜95%' : '95%〜'}</td>
                                            <td style={{ textAlign: 'right' }}>{fmtNum(group.length)} 商品</td>
                                            <td style={{ textAlign: 'right' }}>{fmtLS(gross)}</td>
                                            <td style={{ textAlign: 'right' }}>{pct.toFixed(1)}%</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* アクションコメント */}
                    <div style={{ marginTop: '1rem' }}>
                        {actionComments.map((c, i) => (
                            <div key={i} className="tip-box" style={{ marginTop: i > 0 ? '0.4rem' : 0 }}>{c}</div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
