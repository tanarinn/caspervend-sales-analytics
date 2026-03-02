/**
 * エクスポートボタンコンポーネント
 * PNG出力・CSVダウンロードを提供する
 */
import html2canvas from 'html2canvas'
import { saveAs } from 'file-saver'

/**
 * テーブルデータをCSV文字列に変換
 * @param {Array<string>} headers - ヘッダー列
 * @param {Array<Array>} rows - データ行
 * @returns {string}
 */
function toCSVString(headers, rows) {
    const escape = (v) => {
        const s = String(v ?? '')
        return s.includes(',') || s.includes('"') || s.includes('\n')
            ? `"${s.replace(/"/g, '""')}"`
            : s
    }
    const lines = [headers.map(escape).join(',')]
    for (const row of rows) {
        lines.push(row.map(escape).join(','))
    }
    return '\uFEFF' + lines.join('\n') // BOM付きUTF-8（Excel対応）
}

export default function ExportBtn({ panelRef, csvHeaders, csvRows, fileBaseName = 'export' }) {
    // PNG出力
    const handlePng = async () => {
        if (!panelRef?.current) return
        try {
            const canvas = await html2canvas(panelRef.current, {
                backgroundColor: '#1a1d27',
                scale: 2,
            })
            canvas.toBlob((blob) => {
                saveAs(blob, `${fileBaseName}.png`)
            })
        } catch (e) {
            console.error('PNG出力エラー:', e)
        }
    }

    // CSVダウンロード
    const handleCsv = () => {
        if (!csvHeaders || !csvRows) return
        const csv = toCSVString(csvHeaders, csvRows)
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
        saveAs(blob, `${fileBaseName}.csv`)
    }

    return (
        <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button className="export-btn" onClick={handlePng} title="PNG保存">
                🖼 PNG
            </button>
            {csvHeaders && (
                <button className="export-btn" onClick={handleCsv} title="CSVダウンロード">
                    📥 CSV
                </button>
            )}
        </div>
    )
}
