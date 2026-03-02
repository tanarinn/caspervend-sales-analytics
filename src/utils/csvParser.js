/**
 * CSV解析ユーティリティ
 * PapaParseを用いてUTF-8/Shift-JIS両対応でCSVを読み込む
 */
import Papa from 'papaparse'

/**
 * FileオブジェクトからCSVを読み込み、整形されたトランザクション配列を返す
 * @param {File} file - 読み込むCSVファイル
 * @returns {Promise<{data: Array, errors: Array, meta: Object}>}
 */
export function parseCSV(file) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,          // ヘッダー行を自動認識
            encoding: 'UTF-8',     // UTF-8で試行（Shift-JISはSkipEmptyLinesで対処）
            skipEmptyLines: true,
            dynamicTyping: false,  // 型変換は自前で行う
            complete: (result) => {
                try {
                    const transformed = transformRows(result.data)
                    resolve({
                        data: transformed,
                        errors: result.errors,
                        meta: result.meta,
                    })
                } catch (err) {
                    reject(err)
                }
            },
            error: (err) => {
                // UTF-8失敗時はShift-JISで再試行
                if (err.message && err.message.includes('encoding')) {
                    Papa.parse(file, {
                        header: true,
                        encoding: 'Shift_JIS',
                        skipEmptyLines: true,
                        dynamicTyping: false,
                        complete: (result2) => {
                            try {
                                const transformed = transformRows(result2.data)
                                resolve({
                                    data: transformed,
                                    errors: result2.errors,
                                    meta: result2.meta,
                                })
                            } catch (err2) {
                                reject(err2)
                            }
                        },
                        error: reject,
                    })
                } else {
                    reject(err)
                }
            },
        })
    })
}

/**
 * CSV生データ行を整形・型変換する
 * @param {Array<Object>} rows
 * @returns {Array<Object>}
 */
function transformRows(rows) {
    return rows.map((row) => {
        const gross = parseFloat(row['Gross'] ?? '0') || 0
        const net = parseFloat(row['Net'] ?? '0') || 0
        const received = parseFloat(row['Received'] ?? '0') || 0
        const quantity = parseInt(row['Quantity'] ?? '1') || 1
        const dateStr = row['Date'] || ''
        const date = dateStr ? new Date(dateStr) : null
        const status = (row['Status'] || '').trim()
        const source = (row['Source'] || '').trim()
        const productName = (row['ProductName'] || '').trim()
        const isDemo = gross === 0

        return {
            unixTimestamp: parseInt(row['UnixTimestamp'] ?? '0') || 0,
            date,
            dateStr,
            year: date ? date.getFullYear() : null,
            month: date ? date.getMonth() + 1 : null,   // 1〜12
            yearMonth: date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : null,
            quantity,
            productName,
            gross,
            net,
            received,
            source,
            location: (row['Location'] || '').trim(),
            productID: row['ProductID'] || '',
            fromKey: row['FromKey'] || '',
            toKey: row['ToKey'] || '',
            fromName: row['FromName'] || '',
            toName: row['ToName'] || '',
            status,
            affiliateName: row['AffiliateName'] || '',
            transactionID: row['TransactionID'] || '',
            isComplete: status === 'Complete',
            isDemo, // Gross === 0 の行をDEMOとして扱う
            isPaid: status === 'Complete' && gross > 0,
        }
    })
}
