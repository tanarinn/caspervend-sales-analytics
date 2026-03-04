/**
 * ヘッダーコンポーネント
 * CSVファイルの読み込みエリア・アプリロゴ・言語切り替えボタンを表示する
 */
import { useRef, useState, useCallback } from 'react'
import { parseCSV } from '../../utils/csvParser'
import { useLang } from '../../i18n/LanguageContext'
import strings from '../../i18n/strings'

export default function Header({ onDataLoaded, fileName, rowCount }) {
    const fileInputRef = useRef(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')
    const { lang, toggle } = useLang()
    const t = (key) => strings[lang]?.[key] ?? strings['ja']?.[key] ?? key

    // ファイル処理の共通関数
    const handleFile = useCallback(async (file) => {
        if (!file || !file.name.endsWith('.csv')) {
            setErrorMsg(t('errorCsvOnly'))
            return
        }
        setIsLoading(true)
        setErrorMsg('')
        try {
            const result = await parseCSV(file)
            onDataLoaded(result.data, file.name)
        } catch (err) {
            setErrorMsg(`${t('errorPrefix')}${err.message}`)
        } finally {
            setIsLoading(false)
        }
    }, [onDataLoaded, lang])

    // ドラッグ&ドロップハンドラー
    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
    const handleDragLeave = () => setIsDragging(false)
    const handleDrop = (e) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        handleFile(file)
    }

    return (
        <header className="app-header">
            {/* ロゴ */}
            <div className="header-logo">
                <div className="header-logo-icon">📦</div>
                <span>{t('appTitle')}</span>
            </div>

            {/* ファイル読み込みエリア */}
            <div className="header-upload">
                {/* エラー表示 */}
                {errorMsg && (
                    <span style={{ color: 'var(--accent-red)', fontSize: '0.8rem' }}>⚠ {errorMsg}</span>
                )}

                {/* 読み込み済みバッジ */}
                {fileName && (
                    <div className="file-badge">
                        ✓ {fileName}
                        <span style={{ fontWeight: 400, color: 'var(--accent-green)', opacity: 0.8 }}>
                            {strings[lang]?.rowCount?.(rowCount) ?? `${rowCount} 件`}
                        </span>
                    </div>
                )}

                {/* アップロードゾーン */}
                <label
                    className={`upload-zone ${isDragging ? 'drag-over' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={(e) => handleFile(e.target.files[0])}
                    />
                    {isLoading ? (
                        <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />{t('loading')}</>
                    ) : (
                        <>{fileName ? t('changeCsv') : t('dropCsv')}</>
                    )}
                </label>

                {/* 言語切り替えボタン */}
                <button
                    onClick={toggle}
                    title={lang === 'ja' ? 'Switch to English' : '日本語に切り替え'}
                    style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: 6,
                        color: 'var(--text-secondary)',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        padding: '0.3rem 0.65rem',
                        cursor: 'pointer',
                        letterSpacing: '0.05em',
                        transition: 'background 0.15s',
                        flexShrink: 0,
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                >
                    {t('langToggle')}
                </button>
            </div>
        </header>
    )
}
