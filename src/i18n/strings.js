/**
 * UI文字列の翻訳定義（日本語 / 英語）
 * ナビ・ヘッダー・フィルター・KPI・各パネルタイトルを収録
 */
const strings = {
    ja: {
        // ── アプリ全体 ──
        appTitle: 'CasperVend 売上分析',
        langToggle: 'EN',

        // ── ヘッダー ──
        dropCsv: '📂 CSVをドロップ／選択',
        changeCsv: '📂 CSVを変更',
        loading: '読み込み中...',
        errorCsvOnly: 'CSVファイルを選択してください',
        errorPrefix: '読み込みエラー: ',
        rowCount: (n) => `${n?.toLocaleString('ja-JP')} 件`,

        // ── フィルターバー ──
        filter: '🔍 フィルター',
        filterStart: '開始',
        filterEnd: '終了',
        filterChannel: 'チャネル',
        filterExcludeDemo: 'DEMO除外',
        yearSuffix: '年',
        channelAll: '全チャネル',
        channelMarketplace: 'SL Marketplace',
        channelInWorld: 'CasperVend（インワールド）',

        // ── KPIカード ──
        kpiGross: '総売上（Gross）',
        kpiCount: '取引件数',
        kpiAvgPrice: '客単価（平均）',
        kpiProducts: '販売商品数',
        kpiCountUnit: '件',
        kpiProductUnit: '商品',

        // ── サイドバー ──
        groupStatus: '状況把握',
        groupStrategy: '戦略分析',
        navDiagnosis: '売上診断',
        navYearly: '年別売上',
        navMonthly: '月別売上',
        navRanking: '商品ランキング',
        navPricezone: '価格帯ゾーン',
        navLongtail: 'ロングテール',
        navChannel: 'Marketplace依存率',
        navPareto: 'パレート分析',
        navLifecycle: '商品寿命',
        navPortfolio: '商品ポートフォリオ',
        navDemoEffect: 'DEMO効果分析（β）',

        // ── 空状態 ──
        emptyTitle: 'CSVファイルを読み込んでください',
        emptyDesc: '右上の「CSVをドロップ／選択」からファイルをアップロードすると分析が開始されます。',
        emptyNote: '対応ファイル：UTF-8 / Shift-JIS の CasperVend 売上CSVエクスポート',
    },

    en: {
        // ── App-wide ──
        appTitle: 'CasperVend Analytics',
        langToggle: 'JA',

        // ── Header ──
        dropCsv: '📂 Drop or Select CSV',
        changeCsv: '📂 Change CSV',
        loading: 'Loading...',
        errorCsvOnly: 'Please select a CSV file.',
        errorPrefix: 'Load error: ',
        rowCount: (n) => `${n?.toLocaleString('en-US')} records`,

        // ── FilterBar ──
        filter: '🔍 Filters',
        filterStart: 'From',
        filterEnd: 'To',
        filterChannel: 'Channel',
        filterExcludeDemo: 'Exclude DEMO',
        yearSuffix: '',
        channelAll: 'All Channels',
        channelMarketplace: 'SL Marketplace',
        channelInWorld: 'CasperVend (In-World)',

        // ── KPI Cards ──
        kpiGross: 'Gross Sales',
        kpiCount: 'Transactions',
        kpiAvgPrice: 'Avg. Order Value',
        kpiProducts: 'Products Sold',
        kpiCountUnit: '',
        kpiProductUnit: 'products',

        // ── Sidebar ──
        groupStatus: 'Overview',
        groupStrategy: 'Strategy',
        navDiagnosis: 'Sales Diagnosis',
        navYearly: 'Yearly Sales',
        navMonthly: 'Monthly Sales',
        navRanking: 'Product Ranking',
        navPricezone: 'Price Zone',
        navLongtail: 'Long-Tail',
        navChannel: 'Marketplace Dependency',
        navPareto: 'Pareto Analysis',
        navLifecycle: 'Product Lifecycle',
        navPortfolio: 'Product Portfolio',
        navDemoEffect: 'DEMO Effect (β)',

        // ── Empty state ──
        emptyTitle: 'Please upload a CSV file to begin.',
        emptyDesc: 'Drag & drop or select your CasperVend export CSV from the top-right corner.',
        emptyNote: 'Supported formats: UTF-8 or Shift-JIS CasperVend sales CSV exports.',
    },
}

export default strings
