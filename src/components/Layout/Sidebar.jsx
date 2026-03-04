/**
 * サイドバーナビゲーションコンポーネント
 */
import { useLang } from '../../i18n/LanguageContext'
import strings from '../../i18n/strings'

export default function Sidebar({ activePanel, onSelect }) {
    const { lang } = useLang()
    const t = (key) => strings[lang]?.[key] ?? strings['ja']?.[key] ?? key

    const NAV_ITEMS = [
        {
            group: t('groupStatus'),
            items: [
                { id: 'diagnosis', label: t('navDiagnosis'), icon: '📊' },
                { id: 'yearly', label: t('navYearly'), icon: '📅' },
                { id: 'monthly', label: t('navMonthly'), icon: '📆' },
                { id: 'ranking', label: t('navRanking'), icon: '🏆' },
            ],
        },
        {
            group: t('groupStrategy'),
            items: [
                { id: 'pricezone', label: t('navPricezone'), icon: '💰' },
                { id: 'longtail', label: t('navLongtail'), icon: '📉' },
                { id: 'channel', label: t('navChannel'), icon: '🔗' },
                { id: 'pareto', label: t('navPareto'), icon: '📊' },
                { id: 'lifecycle', label: t('navLifecycle'), icon: '⏳' },
                { id: 'portfolio', label: t('navPortfolio'), icon: '🗂' },
                { id: 'demo-effect', label: t('navDemoEffect'), icon: '🧪' },
            ],
        },
    ]

    return (
        <aside className="app-sidebar">
            {NAV_ITEMS.map((group) => (
                <div key={group.group} className="nav-group">
                    <div className="nav-group-label">{group.group}</div>
                    {group.items.map((item) => (
                        <div
                            key={item.id}
                            className={`nav-item ${activePanel === item.id ? 'active' : ''}`}
                            onClick={() => onSelect(item.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && onSelect(item.id)}
                            id={`nav-${item.id}`}
                        >
                            <span className="nav-item-icon">{item.icon}</span>
                            {item.label}
                        </div>
                    ))}
                </div>
            ))}
        </aside>
    )
}
