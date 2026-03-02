/**
 * KPIカードコンポーネント
 * 総売上・取引件数・客単価・販売商品数を常時表示する
 */
import { useMemo } from 'react'
import { fmtLS, fmtNum, fmtPct, applyFilters } from '../utils/dataHelpers'

const CARD_DEFS = [
    {
        key: 'gross',
        label: '総売上（Gross）',
        icon: '💴',
        color: 'var(--accent-blue)',
        format: fmtLS,
    },
    {
        key: 'count',
        label: '取引件数',
        icon: '🧾',
        color: 'var(--accent-green)',
        format: (v) => `${fmtNum(v)} 件`,
    },
    {
        key: 'avgPrice',
        label: '客単価（平均）',
        icon: '↗',
        color: 'var(--accent-yellow)',
        format: fmtLS,
    },
    {
        key: 'products',
        label: '販売商品数',
        icon: '📦',
        color: 'var(--accent-purple)',
        format: (v) => `${fmtNum(v)} 商品`,
    },
]

export default function KpiCards({ rows, filters }) {
    const kpi = useMemo(() => {
        if (!rows || rows.length === 0) return null
        const filtered = applyFilters(rows, filters)
        const paid = filtered.filter((r) => r.isPaid)
        const gross = paid.reduce((s, r) => s + r.gross, 0)
        const count = paid.length
        const avgPrice = count > 0 ? gross / count : 0
        const products = new Set(paid.map((r) => r.productName)).size
        return { gross, count, avgPrice, products }
    }, [rows, filters])

    if (!kpi) {
        return (
            <div className="kpi-grid">
                {CARD_DEFS.map((def) => (
                    <div key={def.key} className="kpi-card" style={{ '--card-color': def.color }}>
                        <div className="kpi-label">{def.label}</div>
                        <div className="kpi-value" style={{ color: 'var(--text-muted)' }}>—</div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="kpi-grid">
            {CARD_DEFS.map((def) => (
                <div key={def.key} className="kpi-card" style={{ '--card-color': def.color }}>
                    <div className="kpi-label">{def.icon} {def.label}</div>
                    <div className="kpi-value">{def.format(kpi[def.key])}</div>
                </div>
            ))}
        </div>
    )
}
