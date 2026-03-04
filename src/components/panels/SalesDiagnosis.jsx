/**
 * 売上診断パネル（日英対応）
 * 複数の指標を組み合わせてクリエイタータイプを診断し、
 * 強み・課題・行動提案を表示する
 */
import { useMemo, useRef } from 'react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'
import { buildDiagnosisData, applyFilters, fmtLS, fmtNum } from '../../utils/dataHelpers'

// ─── スコアバー ───
function ScoreBar({ value, max = 100, color, label, sub, reversed = false }) {
    const pct = Math.min(Math.max(value, 0), max)
    const fillPct = (pct / max) * 100
    const risk = reversed ? fillPct > 65 : fillPct < 35
    const barColor = risk ? '#ef4444' : color
    return (
        <div style={{ marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{label}</span>
                    {sub && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>{sub}</span>}
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: barColor }}>
                    {value >= 0 && value < 10 ? value.toFixed(1) : Math.round(value)}{max === 100 ? '%' : ''}
                </span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                <div style={{ width: `${fillPct}%`, height: '100%', borderRadius: 3, background: barColor, transition: 'width 0.5s ease' }} />
            </div>
        </div>
    )
}

// ─── トレンドバッジ ───
function TrendBadge({ value }) {
    const isPos = value > 0
    const isNeg = value < 0
    const color = isPos ? '#10b981' : isNeg ? '#ef4444' : '#64748b'
    const icon = isPos ? '▲' : isNeg ? '▼' : '─'
    return (
        <span style={{ color, fontWeight: 700, fontSize: '0.85rem' }}>
            {icon} {Math.abs(value).toFixed(1)}%
        </span>
    )
}

// ─── UI文字列（言語別） ───
const UI = {
    ja: {
        diagnosisLabel: '診断結果',
        trendLabel: '直近3ヶ月トレンド',
        trendSub: '前3ヶ月比',
        activeLabel: 'アクティブ商品数',
        activeUnit: '商品',
        avgLabel: '平均客単価',
        radarNote: 'バランスチャート（高いほど良い）',
        topProducts: '🏆 売上上位5商品',
        subTendency: '＋傾向：',
        strengths: '💪 強み',
        challenges: '⚠️ 課題',
        actions: '🎯 あなたへの行動提案',
        scoreTitle: '📊 診断の根拠となった指標',
        mpScore: 'Marketplace依存率',
        hitScore: 'ヒット集中度（上位3商品）',
        longScore: 'ロングテール強度',
        emptyMsg: 'CSVデータを読み込むと診断が表示されます',
        radarLabels: ['チャネル分散', '商品分散', 'ロングテール', '成長性', '商品数', '客単価'],
    },
    en: {
        diagnosisLabel: 'Diagnosis',
        trendLabel: '3-Month Trend',
        trendSub: 'vs. prev. 3 months',
        activeLabel: 'Active Products',
        activeUnit: 'products',
        avgLabel: 'Avg. Order Value',
        radarNote: 'Balance chart (higher = better)',
        topProducts: '🏆 Top 5 Products by Sales',
        subTendency: '+Tendencies:',
        strengths: '💪 Strengths',
        challenges: '⚠️ Challenges',
        actions: '🎯 Recommended Actions',
        scoreTitle: '📊 Metrics Behind This Diagnosis',
        mpScore: 'Marketplace Reliance',
        hitScore: 'Hit Concentration (Top 3)',
        longScore: 'Long-Tail Strength',
        emptyMsg: 'Upload a CSV file to see your diagnosis.',
        radarLabels: ['Channel Mix', 'Product Mix', 'Long-Tail', 'Growth', 'Catalog Size', 'Avg. Price'],
    },
}

export default function SalesDiagnosis({ rows, filters, lang = 'ja' }) {
    const panelRef = useRef()
    const u = UI[lang] ?? UI.ja

    const result = useMemo(() => {
        if (!rows?.length) return null
        const filtered = applyFilters(rows, { ...filters, excludeDemo: true })
        return buildDiagnosisData(filtered)
    }, [rows, filters])

    if (!result) return (
        <div className="panel-section" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
            {u.emptyMsg}
        </div>
    )

    const { primaryType, subTypes, scores, sortedProducts } = result
    const { marketplacePct, top3Pct, longTailPct, trendPct, activeCount, avgUnitPrice } = scores

    // 現在言語のテキストを取得するヘルパー
    const L = (field) => {
        const v = primaryType[field]
        if (typeof v === 'object' && v !== null) return v[lang] ?? v.ja
        return v
    }
    const Lsub = (type, field) => {
        const v = type[field]
        if (typeof v === 'object' && v !== null) return v[lang] ?? v.ja
        return v
    }

    const radarData = u.radarLabels.map((subject, i) => ({
        subject,
        value: [
            Math.max(0, 100 - marketplacePct),
            Math.max(0, 100 - top3Pct),
            longTailPct,
            Math.min(100, Math.max(0, trendPct + 50)),
            Math.min(100, activeCount * 5),
            Math.min(100, (avgUnitPrice / 2000) * 100),
        ][i],
    }))

    return (
        <div ref={panelRef}>
            {/* ── 主診断カード ── */}
            <div className="panel-section" style={{
                background: `linear-gradient(135deg, ${primaryType.color}18 0%, var(--bg-secondary) 100%)`,
                border: `1px solid ${primaryType.color}40`,
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '3.5rem', lineHeight: 1, flexShrink: 0 }}>{primaryType.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                            {u.diagnosisLabel}
                        </div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 900, color: primaryType.color, letterSpacing: '-0.5px', marginBottom: '0.5rem' }}>
                            {L('label')}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 600 }}>
                            {L('summary')}
                        </div>
                        {/* サブ傾向 */}
                        {subTypes.length > 0 && (
                            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{u.subTendency}</span>
                                {subTypes.map((t) => (
                                    <span key={t.id} style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                        padding: '2px 10px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600,
                                        background: t.color + '20', color: t.color, border: `1px solid ${t.color}40`,
                                    }}>
                                        {t.icon} {Lsub(t, 'label')}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── 強みと課題 ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="panel-section" style={{ borderLeft: '3px solid #10b981' }}>
                    <div style={{ fontWeight: 700, color: '#10b981', marginBottom: '0.6rem', fontSize: '0.85rem' }}>{u.strengths}</div>
                    {L('strengths').map((s, i) => (
                        <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            <span style={{ color: '#10b981', flexShrink: 0 }}>✓</span>
                            <span>{s}</span>
                        </div>
                    ))}
                </div>
                <div className="panel-section" style={{ borderLeft: '3px solid #ef4444' }}>
                    <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: '0.6rem', fontSize: '0.85rem' }}>{u.challenges}</div>
                    {L('challenges').map((c, i) => (
                        <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            <span style={{ color: '#ef4444', flexShrink: 0 }}>!</span>
                            <span>{c}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── 行動提案 ── */}
            <div className="panel-section" style={{ borderLeft: `3px solid ${primaryType.color}` }}>
                <div style={{ fontWeight: 700, color: primaryType.color, marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                    {u.actions}
                </div>
                {L('actions').map((a, i) => (
                    <div key={i} style={{
                        display: 'flex', gap: '0.75rem', padding: '0.65rem 0.85rem',
                        borderRadius: 8, marginBottom: '0.5rem', fontSize: '0.875rem',
                        background: primaryType.color + '0d', border: `1px solid ${primaryType.color}22`,
                        color: 'var(--text-primary)', lineHeight: 1.6,
                    }}>
                        <span style={{ color: primaryType.color, fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>{i + 1}</span>
                        <span>{a}</span>
                    </div>
                ))}
            </div>

            {/* ── 指標スコアとレーダー ── */}
            <div className="panel-section">
                <div className="panel-title" style={{ marginBottom: '1rem' }}>{u.scoreTitle}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: '2rem', alignItems: 'start' }}>
                    <div>
                        <ScoreBar
                            value={marketplacePct}
                            color="#3b82f6"
                            label={u.mpScore}
                            sub={marketplacePct > 65 ? '⚠️' : marketplacePct < 40 ? '✅' : ''}
                            reversed
                        />
                        <ScoreBar
                            value={top3Pct}
                            color="#8b5cf6"
                            label={u.hitScore}
                            sub={top3Pct > 70 ? '⚠️' : top3Pct < 50 ? '✅' : ''}
                            reversed
                        />
                        <ScoreBar
                            value={longTailPct}
                            color="#10b981"
                            label={u.longScore}
                            sub={longTailPct > 50 ? '✅' : ''}
                        />
                        <div style={{ marginBottom: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                                <div>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{u.trendLabel}</span>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>{u.trendSub}</span>
                                </div>
                                <TrendBadge value={trendPct} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '2rem' }}>
                            <div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{u.activeLabel}</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{activeCount} {u.activeUnit}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{u.avgLabel}</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{fmtLS(avgUnitPrice)}</div>
                            </div>
                        </div>
                    </div>

                    {/* レーダーチャート */}
                    <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '0.25rem' }}>{u.radarNote}</div>
                        <ResponsiveContainer width="100%" height={200}>
                            <RadarChart data={radarData} margin={{ top: 10, right: 25, bottom: 10, left: 25 }}>
                                <PolarGrid stroke="var(--border)" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
                                <Radar
                                    dataKey="value"
                                    stroke={primaryType.color}
                                    fill={primaryType.color}
                                    fillOpacity={0.25}
                                    strokeWidth={2}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ── 売上上位5商品 ── */}
            <div className="panel-section">
                <div className="panel-title" style={{ marginBottom: '0.75rem' }}>{u.topProducts}</div>
                {sortedProducts.map((p, i) => (
                    <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
                        <span style={{ width: 20, textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>{i + 1}</span>
                        <span title={p.name} style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{p.name}</span>
                        <div style={{ width: 80, height: 6, borderRadius: 3, background: 'var(--bg-secondary)', overflow: 'hidden', flexShrink: 0 }}>
                            <div style={{ width: `${p.pct}%`, height: '100%', borderRadius: 3, background: primaryType.color, opacity: 0.7 }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', width: 42, textAlign: 'right', flexShrink: 0 }}>{p.pct.toFixed(1)}%</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, width: 80, textAlign: 'right', flexShrink: 0 }}>{fmtLS(p.gross)}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
