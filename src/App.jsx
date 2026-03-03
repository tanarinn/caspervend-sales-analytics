/**
 * アプリルートコンポーネント
 * 全コンポーネントを組み合わせてシングルページアプリを構成する
 */
import { useState, useMemo, useCallback } from 'react'
import Header from './components/Layout/Header'
import Sidebar from './components/Layout/Sidebar'
import FilterBar from './components/Layout/FilterBar'
import KpiCards from './components/KpiCards'
import YearlySales from './components/panels/YearlySales'
import MonthlySales from './components/panels/MonthlySales'
import ProductRanking from './components/panels/ProductRanking'
import PriceZone from './components/panels/PriceZone'
import LongTail from './components/panels/LongTail'
import ChannelDependency from './components/panels/ChannelDependency'
import ParetoAnalysis from './components/panels/ParetoAnalysis'
import ProductLifecycle from './components/panels/ProductLifecycle'
import ProductPortfolio from './components/panels/ProductPortfolio'
import DemoEffect from './components/panels/DemoEffect'
import SalesDiagnosis from './components/panels/SalesDiagnosis'
import { applyFilters, getAvailableYears } from './utils/dataHelpers'

// デフォルトフィルター設定
const DEFAULT_FILTERS = {
    yearStart: '2021',
    yearEnd: '2026',
    channel: 'all',
    excludeDemo: true,
}

export default function App() {
    // CSVデータ
    const [allRows, setAllRows] = useState([])
    const [fileName, setFileName] = useState('')

    // フィルター
    const [filters, setFilters] = useState(DEFAULT_FILTERS)

    // アクティブパネル
    const [activePanel, setActivePanel] = useState('diagnosis')

    // CSV読み込みコールバック
    const handleDataLoaded = useCallback((rows, name) => {
        setAllRows(rows)
        setFileName(name)
        // 読み込んだデータの年範囲でフィルターを自動更新
        const years = getAvailableYears(rows)
        if (years.length > 0) {
            setFilters((prev) => ({
                ...prev,
                yearStart: String(years[0]),
                yearEnd: String(years[years.length - 1]),
            }))
        }
    }, [])

    // 読み込み件数（Complete行のみ）
    const rowCount = useMemo(
        () => allRows.filter((r) => r.isComplete).length,
        [allRows]
    )

    // アクティブなパネルコンポーネントをレンダリング
    const renderPanel = () => {
        if (!allRows.length) {
            return (
                <div className="empty-state">
                    <div className="empty-state-icon">📂</div>
                    <h3>CSVファイルを読み込んでください</h3>
                    <p>右上の「CSVをドロップ／選択」からファイルをアップロードすると<br />分析が開始されます。</p>
                    <p style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>対応ファイル：UTF-8 / Shift-JIS の CasperVend 売上CSVエクスポート</p>
                </div>
            )
        }

        const props = { rows: allRows, filters }
        switch (activePanel) {
            case 'diagnosis': return <SalesDiagnosis {...props} />
            case 'yearly': return <YearlySales {...props} />
            case 'monthly': return <MonthlySales {...props} />
            case 'ranking': return <ProductRanking {...props} />
            case 'pricezone': return <PriceZone {...props} />
            case 'longtail': return <LongTail {...props} />
            case 'channel': return <ChannelDependency {...props} />
            case 'pareto': return <ParetoAnalysis {...props} />
            case 'lifecycle': return <ProductLifecycle {...props} />
            case 'portfolio': return <ProductPortfolio {...props} />
            case 'demo-effect': return <DemoEffect {...props} />
            default: return null
        }
    }

    return (
        <div className="app-layout">
            {/* ヘッダー */}
            <Header
                onDataLoaded={handleDataLoaded}
                fileName={fileName}
                rowCount={rowCount}
            />

            {/* サイドバー */}
            <Sidebar activePanel={activePanel} onSelect={setActivePanel} />

            {/* メインエリア */}
            <main className="app-main">
                {/* グローバルフィルターバー */}
                <FilterBar
                    filters={filters}
                    onChange={setFilters}
                    disabled={!allRows.length}
                />

                {/* コンテンツ */}
                <div className="content-area">
                    {/* KPIカード（常時表示） */}
                    <KpiCards rows={allRows} filters={filters} />

                    {/* 各分析パネル */}
                    {renderPanel()}
                </div>
            </main>
        </div>
    )
}
