import { useEffect, useMemo, useState } from 'react'

export default function FilterBar({ papers, onFilter }) {
  const [yearFrom, setYearFrom] = useState('')
  const [yearTo, setYearTo] = useState('')
  const [minCitations, setMinCitations] = useState('')
  const [sortBy, setSortBy] = useState('relevance')
  const [source, setSource] = useState('all')
  const [open, setOpen] = useState(false)

  const currentYear = new Date().getFullYear()
  const numericYearFrom = yearFrom ? parseInt(yearFrom, 10) : null
  const numericYearTo = yearTo ? parseInt(yearTo, 10) : null
  const numericMinCitations = minCitations ? parseInt(minCitations, 10) : null

  const hasActiveFilters = Boolean(
    yearFrom || yearTo || minCitations || source !== 'all' || sortBy !== 'relevance'
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
    if (source !== 'all') filtered = filtered.filter(p => p.source === source)

    if (sortBy === 'relevance') {
      filtered.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
    } else if (sortBy === 'citations') {
      filtered.sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0))
    } else if (sortBy === 'year') {
      filtered.sort((a, b) => (b.year || 0) - (a.year || 0))
    }
    return filtered
  }, [papers, numericMinCitations, numericYearFrom, numericYearTo, sortBy, source])

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
    setSource('all')
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
            padding: '7px 16px', borderRadius: 8, fontSize: 12,
            fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
            background: open ? '#6366f115' : 'transparent',
            border: `1px solid ${open ? '#6366f140' : '#1e1e35'}`,
            color: open ? '#a5b4fc' : '#64748b'
          }}>
          ⚙ Filters {hasActiveFilters && (
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#6366f1', display: 'inline-block'
            }} />
          )}
        </button>

        {/* Sort pills — always visible */}
        <div style={{ display: 'flex', gap: 6 }}>
          {['relevance', 'citations', 'year'].map(s => (
            <button key={s} onClick={() => {
              setSortBy(s)
            }} style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 11,
              fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              background: sortBy === s ? '#6366f115' : 'transparent',
              border: `1px solid ${sortBy === s ? '#6366f140' : '#1e1e35'}`,
              color: sortBy === s ? '#a5b4fc' : '#475569',
              textTransform: 'capitalize'
            }}>
              {s === 'relevance' ? '★ Relevance' : s === 'citations' ? '↑ Citations' : 'Year'}
            </button>
          ))}
        </div>

        {hasActiveFilters && (
          <button onClick={reset} style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 11,
            background: 'transparent', border: '1px solid #ef444430',
            color: '#ef4444', cursor: 'pointer', fontWeight: 600
          }}>
            ✕ Reset
          </button>
        )}
      </div>

      {/* Expanded filter panel */}
      {open && (
        <div style={{
          background: '#0d0d1a', border: '1px solid #1e1e35',
          borderRadius: 12, padding: '20px 24px',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 16, animation: 'fadeIn 0.2s ease'
        }}>
          {/* Year from */}
          <div>
            <label style={{ fontSize: 11, color: '#475569', fontWeight: 600,
              display: 'block', marginBottom: 6, textTransform: 'uppercase',
              letterSpacing: '0.05em' }}>
              Year From
            </label>
            <input
              type="number"
              value={yearFrom}
              onChange={e => setYearFrom(e.target.value)}
              placeholder="e.g. 2020"
              min="1900" max={currentYear}
              style={{
                width: '100%', background: '#12121f',
                border: '1px solid #1e1e35', borderRadius: 8,
                padding: '8px 12px', color: '#f1f5f9',
                fontSize: 13, outline: 'none'
              }}
            />
          </div>

          {/* Year to */}
          <div>
            <label style={{ fontSize: 11, color: '#475569', fontWeight: 600,
              display: 'block', marginBottom: 6, textTransform: 'uppercase',
              letterSpacing: '0.05em' }}>
              Year To
            </label>
            <input
              type="number"
              value={yearTo}
              onChange={e => setYearTo(e.target.value)}
              placeholder={`e.g. ${currentYear}`}
              min="1900" max={currentYear}
              style={{
                width: '100%', background: '#12121f',
                border: '1px solid #1e1e35', borderRadius: 8,
                padding: '8px 12px', color: '#f1f5f9',
                fontSize: 13, outline: 'none'
              }}
            />
          </div>

          {/* Min citations */}
          <div>
            <label style={{ fontSize: 11, color: '#475569', fontWeight: 600,
              display: 'block', marginBottom: 6, textTransform: 'uppercase',
              letterSpacing: '0.05em' }}>
              Min Citations
            </label>
            <input
              type="number"
              value={minCitations}
              onChange={e => setMinCitations(e.target.value)}
              placeholder="e.g. 50"
              min="0"
              style={{
                width: '100%', background: '#12121f',
                border: '1px solid #1e1e35', borderRadius: 8,
                padding: '8px 12px', color: '#f1f5f9',
                fontSize: 13, outline: 'none'
              }}
            />
          </div>

          {/* Source */}
          <div>
            <label style={{ fontSize: 11, color: '#475569', fontWeight: 600,
              display: 'block', marginBottom: 6, textTransform: 'uppercase',
              letterSpacing: '0.05em' }}>
              Source
            </label>
            <select
              value={source}
              onChange={e => setSource(e.target.value)}
              style={{
                width: '100%', background: '#12121f',
                border: '1px solid #1e1e35', borderRadius: 8,
                padding: '8px 12px', color: '#f1f5f9',
                fontSize: 13, outline: 'none', cursor: 'pointer'
              }}>
              <option value="all">All Sources</option>
              <option value="semanticscholar">Semantic Scholar</option>
              <option value="arxiv">arXiv</option>
            </select>
          </div>

          {/* Apply button */}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button onClick={applyFilters} style={{
              width: '100%', padding: '9px 16px', borderRadius: 8,
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              border: 'none', color: 'white',
              boxShadow: '0 4px 16px #6366f140'
            }}>
              Apply Filters
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  )
}