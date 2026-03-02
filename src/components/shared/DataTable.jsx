/**
 * 共通データテーブルコンポーネント
 * ソート・ページネーション機能を持つ
 */
import { useState, useMemo } from 'react'

export default function DataTable({ columns, data, pageSize = 20, id }) {
    const [sort, setSort] = useState({ key: null, asc: true })
    const [page, setPage] = useState(0)

    // ソート
    const sorted = useMemo(() => {
        if (!sort.key) return data
        return [...data].sort((a, b) => {
            const av = a[sort.key]
            const bv = b[sort.key]
            if (av === null || av === undefined) return 1
            if (bv === null || bv === undefined) return -1
            if (typeof av === 'number') return sort.asc ? av - bv : bv - av
            return sort.asc
                ? String(av).localeCompare(String(bv))
                : String(bv).localeCompare(String(av))
        })
    }, [data, sort])

    const totalPages = Math.ceil(sorted.length / pageSize)
    const paged = sorted.slice(page * pageSize, (page + 1) * pageSize)

    const handleSort = (key) => {
        setSort((prev) => ({ key, asc: prev.key === key ? !prev.asc : true }))
        setPage(0)
    }

    return (
        <div>
            <div className="data-table-wrap" id={id}>
                <table className="data-table">
                    <thead>
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    onClick={() => handleSort(col.key)}
                                    style={{ textAlign: col.align || 'left' }}
                                >
                                    {col.label}
                                    {sort.key === col.key && (sort.asc ? ' ↑' : ' ↓')}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paged.map((row, i) => (
                            <tr key={i}>
                                {columns.map((col) => (
                                    <td key={col.key} style={{ textAlign: col.align || 'left' }}>
                                        {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ページネーション */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'center' }}>
                    <button
                        className="export-btn"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                    >←</button>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {page + 1} / {totalPages}
                    </span>
                    <button
                        className="export-btn"
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={page === totalPages - 1}
                    >→</button>
                </div>
            )}
        </div>
    )
}
