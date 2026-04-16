import { useState } from 'react'

const SOURCE_CONFIG = {
  semanticscholar: { short: 'SS' },
  arxiv: { short: 'ARXIV' },
}

export default function PaperCard({ paper, index, onSelect, isSelected }) {
  const [hovered, setHovered] = useState(false)
  const src = SOURCE_CONFIG[paper.source] || SOURCE_CONFIG.arxiv

  return (
    <div
      onClick={() => onSelect?.(paper)}
      style={{
        background: hovered ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
        border: `1px solid ${paper.isExactMatch ? 'rgba(56, 189, 148, 0.4)' : isSelected ? 'var(--border-highlight)' : hovered ? 'var(--border-highlight)' : 'var(--border-color)'}`,
        boxShadow: paper.isExactMatch ? '0 0 12px rgba(56, 189, 148, 0.08)' : 'none',
        borderRadius: 6,
        overflow: 'hidden',
        transition: 'all var(--trans-base)',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        animation: 'cardIn 0.35s ease both',
        animationDelay: `${index * 0.04}s`,
        cursor: 'pointer',
        position: 'relative'
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Active indicator */}
      {isSelected && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
          background: 'var(--text-secondary)', borderTopLeftRadius: 6, borderBottomLeftRadius: 6
        }} />
      )}

      <div style={{ padding: '18px 22px' }}>
        {/* Top row: badges + score */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 12, marginBottom: 10
        }}>
          <div className="mono-text" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {paper.isExactMatch && (
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '2px 8px',
                borderRadius: 3, background: 'rgba(56, 189, 148, 0.12)',
                border: '1px solid rgba(56, 189, 148, 0.35)', color: '#38bd94',
                letterSpacing: '0.06em', textTransform: 'uppercase'
              }}>
                ✦ EXACT MATCH
              </span>
            )}
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 7px',
              borderRadius: 3, background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)', color: 'var(--text-secondary)',
              letterSpacing: '0.04em'
            }}>
              {src.short}
            </span>
            {paper.year && (
              <span style={{
                fontSize: 10, color: 'var(--text-muted)', padding: '2px 7px',
                background: 'var(--bg-primary)', borderRadius: 3,
                border: '1px solid var(--border-color)'
              }}>
                {paper.year}
              </span>
            )}
          </div>

          <div className="mono-text" style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {paper.citationCount > 0 && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>
                {paper.citationCount.toLocaleString()} cited
              </span>
            )}
            {paper.isExactMatch ? (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px',
                borderRadius: 3, background: 'rgba(56, 189, 148, 0.12)',
                border: '1px solid rgba(56, 189, 148, 0.35)', color: '#38bd94'
              }}>
                1.00
              </span>
            ) : (
              <span style={{
                fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600,
                border: '1px solid var(--border-color)',
                padding: '2px 7px', borderRadius: 3, background: 'var(--bg-primary)'
              }}>
                {paper.relevanceScore != null ? paper.relevanceScore.toFixed(2) : '—'}
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 style={{
          fontSize: 15, fontWeight: 600, color: 'var(--text-primary)',
          lineHeight: 1.4, marginBottom: 8,
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
          letterSpacing: '-0.01em'
        }}>
          {paper.title}
        </h3>

        {/* Authors */}
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {paper.authors?.slice(0, 3).map(a => typeof a === 'string' ? a : a.name).join(', ')}
          {paper.authors?.length > 3 && ` +${paper.authors.length - 3} more`}
        </div>
      </div>

      <style>{`
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}