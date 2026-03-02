/**
 * サイドバーナビゲーションコンポーネント
 */

// ナビゲーション項目定義
const NAV_ITEMS = [
    {
        group: '状況把握',
        items: [
            { id: 'yearly', label: '年別売上', icon: '📅' },
            { id: 'monthly', label: '月別売上', icon: '📆' },
            { id: 'ranking', label: '商品ランキング', icon: '🏆' },
        ],
    },
    {
        group: '戦略分析',
        items: [
            { id: 'pricezone', label: '価格帯ゾーン', icon: '💰' },
            { id: 'longtail', label: 'ロングテール', icon: '📉' },
            { id: 'channel', label: 'Marketplace依存率', icon: '🔗' },
            { id: 'pareto', label: 'パレート分析', icon: '📊' },
            { id: 'lifecycle', label: '商品寿命', icon: '⏳' },
            { id: 'portfolio', label: '商品ポートフォリオ', icon: '🗂' },
            { id: 'demo-effect', label: 'DEMO効果分析（β）', icon: '🧪' },
        ],
    },
]

export default function Sidebar({ activePanel, onSelect }) {
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
