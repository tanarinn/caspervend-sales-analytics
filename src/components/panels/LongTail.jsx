/**
 * ロングテール分析パネル（4.2）
 * 折れ線（累積売上%）＋面グラフ＋インタラクティブカーソル
 */
import { useMemo, useRef } from 'react'
import {
    ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { buildLongTailData, applyFilters, fmtLS, fmtNum } from '../../utils/dataHelpers'
import ExportBtn from '../shared/ExportBtn'

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    return (
        <div className="custom-tooltip">
            <div className="custom-tooltip-label">#{label} {d?.productName?.slice(0, 30)}{d?.productName?.length > 30 ? '…' : ''}</div>
            <div className="custom-tooltip-item"><span>売上</span><span className="custom-tooltip-value">{fmtLS(d?.gross)}</span></div>
            <div className="custom-tooltip-item"><span>累積構成比</span><span className="custom-tooltip-value">{d?.cumulativePct?.toFixed(1)}%</span></div>
            <div className="custom-tooltip-item"><span>グループ</span><span className="custom-tooltip-value" style={{ color: d?.group === 'A' ? 'var(--chart-1)' : d?.group === 'B' ? 'var(--chart-3)' : 'var(--text-muted)' }}>{d?.group}群</span></div>
        </div>
    )
}

export default function LongTail({ rows, filters }) {
    const panelRef = useRef()

    const data = useMemo(() => {
        if (!rows?.length) return []
        const filtered = applyFilters(rows, filters)
        return buildLongTailData(filtered)
    }, [rows, filters])

    // 集計
    const summary = useMemo(() => {
        if (!data.length) return null
        const total = data.length
        const top10pct = Math.ceil(total * 0.1)
        const top10sum = data.slice(0, top10pct).reduce((s, d) => s + d.gross, 0)
        const totalGross = data.reduce((s, d) => s + d.gross, 0)
        const bottom50 = data.slice(Math.floor(total * 0.5))
        const bottom50sum = bottom50.reduce((s, d) => s + d.gross, 0)
        const groupA = data.filter((d) => d.group === 'A')
        const groupB = data.filter((d) => d.group === 'B')
        const groupC = data.filter((d) => d.group === 'C')
        return {
            total,
            top10pct,
            top10sum,
            totalGross,
            top10pctRate: totalGross > 0 ? (top10sum / totalGross) * 100 : 0,
            bottom50Count: bottom50.length,
            bottom50sum,
            groupA: groupA.length,
            groupB: groupB.length,
            groupC: groupC.length,
            isWide: groupC.length / total > 0.5, // ロングテール比率が高い
        }
    }, [data])

    return (
        <div ref={panelRef}>
            <div className="panel-section">
                <div className="panel-header">
                    <div>
                        <div className="panel-title">📉 ロングテール分析</div>
                        <div className="panel-sub">X軸：商品ランク、Y軸：累積売上構成比（%）</div>
                    </div>
                    <ExportBtn panelRef={panelRef} csvHeaders={['順位', '商品名', '売上(L$)', '累積(%)', 'グループ']} csvRows={data.map((d) => [d.rank, d.productName, Math.round(d.gross), d.cumulativePct.toFixed(1), d.group])} fileBaseName="longtail" />
                </div>

                {summary?.isWide && (
                    <div className="alert-banner alert-banner-warn">
                        💡 ロングテール比率が高く、商品多様性が高い状態です。幅広い商品展開でユーザーニーズに対応しています。
                    </div>
                )}

                <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={data} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="rank" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} label={{ value: '商品ランク', position: 'insideBottomRight', fill: 'var(--text-muted)', fontSize: 11, offset: -5 }} />
                        <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine y={80} stroke="var(--accent-red)" strokeDasharray="5 5" label={{ value: '80%', fill: 'var(--accent-red)', fontSize: 11, position: 'right' }} />
                        <ReferenceLine y={95} stroke="var(--accent-yellow)" strokeDasharray="5 5" label={{ value: '95%', fill: 'var(--accent-yellow)', fontSize: 11, position: 'right' }} />
                        <Area type="monotone" dataKey="cumulativePct" fill="rgba(59,130,246,0.1)" stroke="none" />
                        <Line type="monotone" dataKey="cumulativePct" stroke="var(--accent-blue)" strokeWidth={2.5} dot={false} name="累積構成比（%）" />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {summary && (
                <div className="panel-section">
                    <div className="panel-title" style={{ marginBottom: '0.75rem' }}>📌 サマリー</div>
                    <div className="summary-cards">
                        <div className="summary-item">
                            <div className="summary-item-label">上位10%商品（{summary.top10pct}商品）の貢献率</div>
                            <div className="summary-item-value" style={{ color: 'var(--accent-blue)' }}>{summary.top10pctRate.toFixed(1)}%</div>
                        </div>
                        <div className="summary-item">
                            <div className="summary-item-label">下位50%商品（{summary.bottom50Count}商品）の合計売上</div>
                            <div className="summary-item-value">{fmtLS(summary.bottom50sum)}</div>
                        </div>
                        <div className="summary-item">
                            <div className="summary-item-label">A群（累積80%まで）</div>
                            <div className="summary-item-value"><span className="badge badge-blue">{summary.groupA} 商品</span></div>
                        </div>
                        <div className="summary-item">
                            <div className="summary-item-label">B群（80〜95%）</div>
                            <div className="summary-item-value"><span className="badge badge-yellow">{summary.groupB} 商品</span></div>
                        </div>
                        <div className="summary-item">
                            <div className="summary-item-label">C群（95%以降）</div>
                            <div className="summary-item-value"><span className="badge badge-purple">{summary.groupC} 商品</span></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
