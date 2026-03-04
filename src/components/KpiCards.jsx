/**
 * KPIカードコンポーネント
 * 総売上・取引件数・客単価・販売商品数を常時表示する
 */
import { useMemo } from 'react'
import { fmtLS, fmtNum, applyFilters } from '../utils/dataHelpers'
import { useLang } from '../i18n/LanguageContext'
import strings from '../i18n/strings'

export default function KpiCards({ rows, filters }) {
    const { lang } = useLang()
    const t = (key) => strings[lang]?.[key] ?? strings['ja']?.[key] ?? key

    const CARD_DEFS = [
        {
            key: 'gross',
            label: t('kpiGross'),
            icon: '💴',
            color: 'var(--accent-blue)',
            format: fmtLS,
        },
        {
            key: 'count',
            label: t('kpiCount'),
            icon: '🧾',
            color: 'var(--accent-green)',
            format: (v) => lang === 'en' ? `${fmtNum(v)}` : `${fmtNum(v)} ${t('kpiCountUnit')}`,
        },
        {
            key: 'avgPrice',
            label: t('kpiAvgPrice'),
            icon: '↗',
            color: 'var(--accent-yellow)',
            format: fmtLS,
        },
        {
            key: 'products',
            label: t('kpiProducts'),
            icon: '📦',
            color: 'var(--accent-purple)',
            format: (v) => `${fmtNum(v)} ${t('kpiProductUnit')}`,
        },
    ]

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
