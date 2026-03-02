/**
 * ヘッダーコンポーネント
 * CSVファイルの読み込みエリアとアプリロゴを表示する
 */
import { useRef, useState, useCallback } from 'react'
import { parseCSV } from '../../utils/csvParser'

export default function Header({ onDataLoaded, fileName, rowCount }) {
    const fileInputRef = useRef(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')

    // ファイル処理の共通関数
    const handleFile = useCallback(async (file) => {
        if (!file || !file.name.endsWith('.csv')) {
            setErrorMsg('CSVファイルを選択してください')
            return
        }
        setIsLoading(true)
        setErrorMsg('')
        try {
            const result = await parseCSV(file)
            onDataLoaded(result.data, file.name)
        } catch (err) {
            setErrorMsg(`読み込みエラー: ${err.message}`)
        } finally {
            setIsLoading(false)
        }
    }, [onDataLoaded])

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
                <span>CasperVend 売上分析</span>
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
                            {rowCount?.toLocaleString('ja-JP')} 件
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
                        <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />読み込み中...</>
                    ) : (
                        <>{fileName ? '📂 CSVを変更' : '📂 CSVをドロップ／選択'}</>
                    )}
                </label>
            </div>
        </header>
    )
}
