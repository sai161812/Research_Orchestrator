import { useEffect, useMemo, useState } from 'react'

export default function FilterBar({ papers, onFilter }) {
  const [yearFrom, setYearFrom] = useState('')
  const [yearTo, setYearTo] = useState('')
  const [minCitations, setMinCitations] = useState('')
  const [sortBy, setSortBy] = useState('relevance')
  const [open, setOpen] = useState(false)

  const currentYear = new Date().getFullYear()
  const numericYearFrom = yearFrom ? parseInt(yearFrom, 10) : null
  const numericYearTo = yearTo ? parseInt(yearTo, 10) : null
  const numericMinCitations = minCitations ? parseInt(minCitations, 10) : null

  const hasActiveFilters = Boolean(
    yearFrom || yearTo || minCitations || sortBy !== 'relevance'
  )

  const sortedAndFiltered = useMemo(() => {
    let filtered = [...papers]

    const yearMin = numericYearFrom ?? null
    const yearMax = numericYearTo ?? null
    const from = yearMin !== null && yearMax !== null ? Math.min(yearMin, yearMax) : yearMin
    const to = yearMin !== null && yearMax !== null ? Math.max(yearMin, yearMax) : yearMax

    if (from !== null) filtered = filtered.filter(p => (p.year || 0) >= from)
    if (to !== null) filtered = filtered.filter(p => (p.year || 0) <= to)
    if (numericMinCitations !== null) {
      filtered = filtered.filter(p => (p.citationCount || 0) >= numericMinCitations)
    }
    if (sortBy === 'relevance') {
      filtered.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
    } else if (sortBy === 'citations') {
      filtered.sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0))
    } else if (sortBy === 'year') {
      filtered.sort((a, b) => (b.year || 0) - (a.year || 0))
    }
    return filtered
  }, [papers, numericMinCitations, numericYearFrom, numericYearTo, sortBy])

  const applyFilters = () => {
    onFilter({ papers: sortedAndFiltered, active: hasActiveFilters })
  }

  useEffect(() => {
    onFilter({ papers: sortedAndFiltered, active: hasActiveFilters })
  }, [sortedAndFiltered, hasActiveFilters, onFilter])

  const reset = () => {
    setYearFrom('')
    setYearTo('')
    setMinCitations('')
    setSortBy('relevance')
    onFilter({ papers, active: false })
  }

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Filter toggle bar */}
      <div style={{
        display: 'flex', alignItems: 'center',
        gap: 10, marginBottom: open ? 16 : 0
      }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 4, fontSize: 11,
            fontWeight: 600, cursor: 'pointer', transition: 'all var(--trans-fast)',
            background: open ? 'var(--text-secondary)' : 'var(--bg-primary)',
            border: `1px solid var(--border-color)`,
            color: open ? 'var(--bg-primary)' : 'var(--text-primary)',
            textTransform: 'uppercase', letterSpacing: '0.05em'
          }}>
          FILTERS {hasActiveFilters && (
            <span style={{
              width: 4, height: 4, borderRadius: '50%',
              background: open ? 'var(--bg-primary)' : 'var(--text-primary)', display: 'inline-block'
            }} />
          )}
        </button>

        {/* Sort pills — always visible */}
        <div style={{ display: 'flex', gap: 6 }}>
          {['relevance', 'citations', 'year'].map(s => (
            <button key={s} onClick={() => {
              setSortBy(s)
            }} style={{
              padding: '6px 12px', borderRadius: 4, fontSize: 11,
              fontWeight: 600, cursor: 'pointer', transition: 'all var(--trans-fast)',
              background: sortBy === s ? 'var(--text-secondary)' : 'var(--bg-primary)',
              border: `1px solid var(--border-color)`,
              color: sortBy === s ? 'var(--bg-primary)' : 'var(--text-secondary)',
              textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>
              {s}
            </button>
          ))}
        </div>

        {hasActiveFilters && (
          <button onClick={reset} style={{
            padding: '6px 12px', borderRadius: 4, fontSize: 11,
            background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.05em'
          }}>
            RESET
          </button>
        )}
      </div>

      {/* Expanded filter panel */}
      {open && (
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
          borderRadius: 8, padding: '20px 24px',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 16, animation: 'fadeIn 0.2s ease'
        }}>
          {/* Year from */}
          <div>
            <label className="mono-text" style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600,
              display: 'block', marginBottom: 6, textTransform: 'uppercase',
              letterSpacing: '0.05em' }}>
              Year From
            </label>
            <input
              type="number"
              value={yearFrom}
              onChange={e => setYearFrom(e.target.value)}
              placeholder="1900"
              min="1900" max={currentYear}
              style={{
                width: '100%', background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)', borderRadius: 4,
                padding: '8px 12px', color: 'var(--text-primary)',
                fontSize: 13, outline: 'none',
                fontFamily: 'var(--font-sans)'
              }}
            />
          </div>

          {/* Year to */}
          <div>
            <label className="mono-text" style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600,
              display: 'block', marginBottom: 6, textTransform: 'uppercase',
              letterSpacing: '0.05em' }}>
              Year To
            </label>
            <input
              type="number"
              value={yearTo}
              onChange={e => setYearTo(e.target.value)}
              placeholder={`${currentYear}`}
              min="1900" max={currentYear}
              style={{
                width: '100%', background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)', borderRadius: 4,
                padding: '8px 12px', color: 'var(--text-primary)',
                fontSize: 13, outline: 'none',
                fontFamily: 'var(--font-sans)'
              }}
            />
          </div>

          {/* Min citations */}
          <div>
            <label className="mono-text" style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600,
              display: 'block', marginBottom: 6, textTransform: 'uppercase',
              letterSpacing: '0.05em' }}>
              Min Citations
            </label>
            <input
              type="number"
              value={minCitations}
              onChange={e => setMinCitations(e.target.value)}
              placeholder="0"
              min="0"
              style={{
                width: '100%', background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)', borderRadius: 4,
                padding: '8px 12px', color: 'var(--text-primary)',
                fontSize: 13, outline: 'none',
                fontFamily: 'var(--font-sans)'
              }}
            />
          </div>

          {/* Apply button */}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button onClick={applyFilters} style={{
              width: '100%', padding: '9px 16px', borderRadius: 4,
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: 'var(--text-primary)',
              border: '1px solid var(--text-primary)', color: 'var(--bg-primary)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              transition: 'background var(--trans-fast)'
            }}>
              APPLY
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  )
}