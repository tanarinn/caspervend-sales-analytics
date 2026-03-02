/**
 * グローバルフィルターバーコンポーネント
 * 期間（年）・チャネル・DEMO除外トグルを提供する
 */

const YEARS = [2021, 2022, 2023, 2024, 2025, 2026]

const CHANNELS = [
    { value: 'all', label: '全チャネル' },
    { value: 'SL Marketplace', label: 'SL Marketplace' },
    { value: '__in_world__', label: 'CasperVend（インワールド）' },
]

export default function FilterBar({ filters, onChange, disabled }) {
    const handleChange = (key, value) => {
        onChange({ ...filters, [key]: value })
    }

    return (
        <div className="filter-bar">
            <span className="filter-bar-label">🔍 フィルター</span>

            {/* 期間：開始年 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className="filter-bar-label">開始</span>
                <select
                    className="filter-select"
                    value={filters.yearStart}
                    onChange={(e) => handleChange('yearStart', e.target.value)}
                    disabled={disabled}
                    id="filter-year-start"
                >
                    {YEARS.map((y) => (
                        <option key={y} value={y}>{y}年</option>
                    ))}
                </select>
            </div>

            <span style={{ color: 'var(--text-muted)' }}>〜</span>

            {/* 期間：終了年 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className="filter-bar-label">終了</span>
                <select
                    className="filter-select"
                    value={filters.yearEnd}
                    onChange={(e) => handleChange('yearEnd', e.target.value)}
                    disabled={disabled}
                    id="filter-year-end"
                >
                    {YEARS.map((y) => (
                        <option key={y} value={y}>{y}年</option>
                    ))}
                </select>
            </div>

            {/* チャネル */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className="filter-bar-label">チャネル</span>
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
                <span>DEMO除外</span>
            </label>
        </div>
    )
}
