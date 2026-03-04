/**
 * グローバルフィルターバーコンポーネント
 * 期間（年）・チャネル・DEMO除外トグルを提供する
 */
import { useLang } from '../../i18n/LanguageContext'
import strings from '../../i18n/strings'

const YEARS = [2021, 2022, 2023, 2024, 2025, 2026]

export default function FilterBar({ filters, onChange, disabled }) {
    const { lang } = useLang()
    const t = (key) => strings[lang]?.[key] ?? strings['ja']?.[key] ?? key

    const CHANNELS = [
        { value: 'all', label: t('channelAll') },
        { value: 'SL Marketplace', label: t('channelMarketplace') },
        { value: '__in_world__', label: t('channelInWorld') },
    ]

    const handleChange = (key, value) => {
        onChange({ ...filters, [key]: value })
    }

    const yearLabel = (y) => `${y}${t('yearSuffix')}`

    return (
        <div className="filter-bar">
            <span className="filter-bar-label">{t('filter')}</span>

            {/* 期間：開始年 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className="filter-bar-label">{t('filterStart')}</span>
                <select
                    className="filter-select"
                    value={filters.yearStart}
                    onChange={(e) => handleChange('yearStart', e.target.value)}
                    disabled={disabled}
                    id="filter-year-start"
                >
                    {YEARS.map((y) => (
                        <option key={y} value={y}>{yearLabel(y)}</option>
                    ))}
                </select>
            </div>

            <span style={{ color: 'var(--text-muted)' }}>—</span>

            {/* 期間：終了年 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className="filter-bar-label">{t('filterEnd')}</span>
                <select
                    className="filter-select"
                    value={filters.yearEnd}
                    onChange={(e) => handleChange('yearEnd', e.target.value)}
                    disabled={disabled}
                    id="filter-year-end"
                >
                    {YEARS.map((y) => (
                        <option key={y} value={y}>{yearLabel(y)}</option>
                    ))}
                </select>
            </div>

            {/* チャネル */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className="filter-bar-label">{t('filterChannel')}</span>
                <select
                    className="filter-select"
                    value={filters.channel}
                    onChange={(e) => handleChange('channel', e.target.value)}
                    disabled={disabled}
                    id="filter-channel"
                >
                    {CHANNELS.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                </select>
            </div>

            {/* DEMOを除外トグル */}
            <label className="filter-toggle" id="filter-demo-toggle">
                <div
                    className={`toggle-switch ${filters.excludeDemo ? 'on' : ''}`}
                    onClick={() => !disabled && handleChange('excludeDemo', !filters.excludeDemo)}
                />
                <span>{t('filterExcludeDemo')}</span>
            </label>
        </div>
    )
}
