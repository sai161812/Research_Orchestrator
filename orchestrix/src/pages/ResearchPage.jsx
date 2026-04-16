import { useState, useRef, useEffect } from 'react'
import { runOrchestrator, continueEntityRun } from '../orchestrator/Orchestrator'
import PaperCard from '../components/PaperCard'
import TracePanel from '../components/TracePanel'
import WorkspacePanel from '../components/WorkspacePanel'
import EntityConfirm from '../components/EntityConfirm'
import FilterBar from '../components/FilterBar'
import CitationAgent from '../agents/CitationAgent'
import { getSessionById, getActiveSessionId, setActiveSessionId } from '../store/sessionStore'

const SUGGESTIONS = [
  'AI in healthcare trends',
  'Recent advances in large language models',
  'Quantum computing algorithms',
  'Computer vision deep learning',
]

export default function ResearchPage() {
  const [query, setQuery] = useState('')
  const [sessionName, setSessionName] = useState('')
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState('idle')
  const [trace, setTrace] = useState([])
  const [traceOpen, setTraceOpen] = useState(true)
  const [papers, setPapers] = useState([])
  const [filteredPapers, setFilteredPapers] = useState([])
  const [isFilterActive, setIsFilterActive] = useState(false)
  const [citations, setCitations] = useState({})
  const [intent, setIntent] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [selectedPapers, setSelectedPapers] = useState([])
  const [pendingSessionId, setPendingSessionId] = useState(null)
  const [page, setPage] = useState(1)
  const [fallbackExhausted, setFallbackExhausted] = useState(false)
  const [comparing, setComparing] = useState(false)
  const [compareResult, setCompareResult] = useState(null)
  const [mentorPaper, setMentorPaper] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const activeId = getActiveSessionId()
    if (activeId) {
      const db = getSessionById(activeId)
      if (db) {
        setQuery(db.query || '')
        setSessionName(db.name || '')
        setPapers(db.papers || [])
        setCitations(db.citations || {})
        setIntent(db.intent || null)
        setSessionId(db.id)
        setTrace(db.trace || [])
        if (db.papers && db.papers.length > 0) setStage('results')
        else if (db.intent && db.intent.type === 'entity') setStage('confirm')
      }
    }
  }, [])

  const handleSearch = async (q = query) => {
    if (!q.trim() || loading) return
    setLoading(true)
    setStage('loading')
    setTrace([])
    setTraceOpen(true)
    setPapers([])
    setFilteredPapers([])
    setIsFilterActive(false)
    setCitations({})
    setSelectedPapers([])
    setIntent(null)
    setSessionId(null)
    setPendingSessionId(null)
    setPage(1)
    setFallbackExhausted(false)

    const result = await runOrchestrator(
      q.trim(),
      sessionName.trim() || null,
      (t) => setTrace([...t])
    )

    if (result.status === 'awaiting_confirmation') {
      setIntent(result.intent)
      setSessionId(result.sessionId)
      setPendingSessionId(result.sessionId)
      setTrace(result.trace)
      setStage('confirm')
      setLoading(false)
      return
    }

    if (result.status === 'done') {
      setPapers(result.papers)
      setCitations(result.citations)
      setSessionId(result.sessionId)
      setActiveSessionId(result.sessionId)
      setIntent(result.intent)
      setFallbackExhausted(false)
      setStage('results')
    } else {
      setStage('error')
    }

    setLoading(false)
  }

  const handleEntityConfirm = async (topics) => {
    setLoading(true)
    setStage('loading')
    setTrace([])

    const result = await continueEntityRun(
      pendingSessionId, topics,
      (t) => setTrace([...t])
    )

    if (result.status === 'done') {
      setPapers(result.papers)
      setCitations(result.citations)
      setActiveSessionId(pendingSessionId)
      setFallbackExhausted(Boolean(result.fallbackExhausted))
      setStage('results')
    } else {
      setStage('error')
    }
    setLoading(false)
  }

  const handleSelect = (paper) => {
    setSelectedPapers(prev =>
      prev.find(p => p.id === paper.id)
        ? prev.filter(p => p.id !== paper.id)
        : [...prev, paper]
    )
  }

  const handleCompare = async () => {
    if (selectedPapers.length !== 2) return
    setComparing(true)
    const { default: SummarizationAgent } = await import('../agents/SummarizationAgent')
    const result = await SummarizationAgent.compareTwoPapers(selectedPapers[0], selectedPapers[1])
    
    if (result && !result.error) {
      setCompareResult(result)
    }
    setComparing(false)
  }

  const loadMore = async () => {
    const nextPage = page + 1
    setPage(nextPage)
    const { default: DiscoveryAgent } = await import('../agents/DiscoveryAgent')
    const more = await DiscoveryAgent.run(query, nextPage)
    const newCitations = {}
    more.forEach(p => { newCitations[p.id] = CitationAgent.generateAll(p) })
    setPapers(prev => [...prev, ...more])
    setCitations(prev => ({ ...prev, ...newCitations }))
  }

  const displayPapers = isFilterActive ? filteredPapers : papers

  // Layout check
  const hasTrace = trace.length > 0
  const showRightPanel = selectedPapers.length > 0 || compareResult || mentorPaper

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--bg-primary)'
    }}>

      {/* ── TRACE PANEL (LEFT) ── */}
      {hasTrace && (
        <TracePanel
          trace={trace}
          isOpen={traceOpen}
          // The TracePanel controls its own width internally now, but we render it here
        />
      )}

      {/* ── CENTER WORKSPACE ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        position: 'relative'
      }}>
        {/* HERO */}
        <HeroSection
          query={query}
          setQuery={setQuery}
          sessionName={sessionName}
          setSessionName={setSessionName}
          onSearch={handleSearch}
          loading={loading}
          stage={stage}
          inputRef={inputRef}
        />

        {/* LOADING */}
        {stage === 'loading' && (
          <div style={{
            maxWidth: 600, margin: '40px auto',
            textAlign: 'center', padding: '0 24px'
          }}>
            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
              borderRadius: 8, padding: '32px 24px'
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '2px solid var(--border-color)', borderTopColor: 'var(--text-secondary)',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 16px'
              }} />
              <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 8 }}>
                Orchestrating research pipeline...
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                Executing search and discovery agents. Please wait.
              </div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          </div>
        )}

        {/* ENTITY CONFIRM */}
        {stage === 'confirm' && intent && (
          <EntityConfirm
            intent={intent}
            onConfirm={handleEntityConfirm}
            onCancel={() => setStage('idle')}
          />
        )}

        {/* RESULTS */}
        {stage === 'results' && papers.length > 0 && (
          <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 32px 80px' }}>
            {/* Results header */}
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
              marginBottom: 20, paddingBottom: 16,
              borderBottom: '1px solid var(--border-color)'
            }}>
              <div className="mono-text" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {displayPapers.length} PAPERS
                {isFilterActive ? ' (FILTERED)' : ' FOUND'} FOR{' '}
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  "{query.toUpperCase()}"
                </span>
                {displayPapers.some(p => p.isExactMatch) && (
                  <span style={{ color: '#38bd94', fontWeight: 700, marginLeft: 8 }}>
                    — EXACT TITLE MATCH FOUND
                  </span>
                )}
              </div>

              <div className="mono-text" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {selectedPapers.length > 0 && (
                  <div style={{
                    fontSize: 10, color: 'var(--text-secondary)', fontWeight: 700,
                    background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                    padding: '4px 10px', borderRadius: 4
                  }}>
                    {selectedPapers.length} SELECTED
                  </div>
                )}
                <button
                  onClick={handleCompare}
                  disabled={selectedPapers.length !== 2 || comparing}
                  style={{
                    padding: '4px 12px', borderRadius: 4, fontSize: 10,
                    fontWeight: 700, cursor: selectedPapers.length === 2 ? 'pointer' : 'not-allowed', 
                    transition: 'all 0.2s',
                    background: selectedPapers.length === 2 ? 'var(--text-secondary)' : 'var(--bg-primary)', 
                    border: `1px solid var(--border-color)`,
                    color: selectedPapers.length === 2 ? 'var(--bg-primary)' : 'var(--text-muted)'
                  }}>
                  {comparing ? 'COMPARING...' : 'COMPARE (2)'}
                </button>
              </div>
            </div>

            {/* Comparison Result Panel - shown inline if requested */}
            {compareResult && (
              <div style={{
                background: 'var(--bg-surface)', border: '1px solid var(--text-secondary)',
                borderRadius: 8, padding: 20, marginBottom: 20,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 className="mono-text" style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.05em' }}>
                    TECHNICAL COMPARISON
                  </h3>
                  <button onClick={() => setCompareResult(null)} style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 4, color: 'var(--text-muted)', cursor: 'pointer', fontSize: 10, padding: '2px 8px' }}>CLOSE</button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <div><strong style={{color: 'var(--text-primary)'}}>Summary Diff:</strong> {compareResult.summary_diff}</div>
                  <div><strong style={{color: 'var(--text-primary)'}}>Citation Impact:</strong> {compareResult.citation_comparison}</div>
                  <div><strong style={{color: 'var(--text-primary)'}}>Recency:</strong> {compareResult.recency_comparison}</div>
                  <div style={{ padding: 16, background: 'var(--bg-primary)', borderRadius: 4, borderLeft: '2px solid var(--text-secondary)', color: 'var(--text-primary)' }}>
                    <strong>Takeaways:</strong> {compareResult.key_takeaways}
                  </div>
                </div>
              </div>
            )}

            {/* Filter bar */}
            <FilterBar
              papers={papers}
              onFilter={({ papers: next, active }) => {
                setFilteredPapers(next)
                setIsFilterActive(Boolean(active))
              }}
            />

            {/* Paper cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {displayPapers.map((paper, i) => (
                <PaperCard
                  key={paper.id}
                  paper={paper}
                  index={i}
                  onSelect={handleSelect}
                  isSelected={selectedPapers.some(p => p.id === paper.id)}
                />
              ))}
            </div>

            {/* Load more */}
            {filteredPapers.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: 40 }}>
                <button onClick={loadMore} className="mono-text" style={{
                  padding: '8px 24px', borderRadius: 4, fontSize: 11,
                  fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                  background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                }}
                  onMouseEnter={e => {
                    e.target.style.borderColor = 'var(--text-secondary)'
                    e.target.style.color = 'var(--text-primary)'
                  }}
                  onMouseLeave={e => {
                    e.target.style.borderColor = 'var(--border-color)'
                    e.target.style.color = 'var(--text-muted)'
                  }}>
                  LOAD MORE
                </button>
              </div>
            )}
          </div>
        )}

        {/* NO RESULTS */}
        {stage === 'results' && papers.length === 0 && fallbackExhausted && (
          <div style={{
            maxWidth: 560, margin: '40px auto', textAlign: 'center',
            padding: 32, background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)', borderRadius: 8
          }}>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 8 }}>
              No papers found
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Try applying broader keywords or simpler terms.
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {stage === 'idle' && (
          <div style={{
            textAlign: 'center', padding: '20px 24px 80px',
            color: 'var(--text-muted)', fontSize: 13
          }}>
            SYSTEM IDLE — AWAITING QUERY PIPELINE
          </div>
        )}

        {/* ERROR */}
        {stage === 'error' && (
          <div style={{
            maxWidth: 500, margin: '40px auto', textAlign: 'center',
            padding: 32, background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)', borderRadius: 8
          }}>
            <div className="mono-text" style={{ fontSize: 12, marginBottom: 12, color: 'var(--text-secondary)', fontWeight: 700 }}>
              [ ERR_PIPELINE_FAILURE ]
            </div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 8 }}>
              Pipeline Execution Terminated
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Check API configurations or network stability.
            </div>
          </div>
        )}
      </div>

      {/* ── WORKSPACE PANEL (RIGHT) ── */}
      {showRightPanel && (
        <WorkspacePanel
          selectedPapers={selectedPapers}
          compareResult={compareResult}
          mentorPaper={mentorPaper}
          onCloseMentor={() => setMentorPaper(null)}
          onTogglePaper={handleSelect}
          citations={citations}
        />
      )}
    </div>
  )
}

// ── Hero + Search ─────────────────────────────────────────────────────────────
function HeroSection({ query, setQuery, sessionName, setSessionName, onSearch, loading, stage, inputRef }) {
  const [focused, setFocused] = useState(false)
  const collapsed = stage !== 'idle'

  return (
    <div style={{
      padding: collapsed ? '40px 32px 32px' : '12vh 32px 60px',
      transition: 'padding 0.5s cubic-bezier(0.4,0,0.2,1)',
      position: 'relative'
    }}>

      <div style={{
        maxWidth: 720, margin: '0 auto', textAlign: 'center'
      }}>
        {!collapsed && (
          <>
            <div className="mono-text" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
              borderRadius: 4, padding: '4px 10px', marginBottom: 28
            }}>
              <div style={{
                width: 6, height: 6, background: 'var(--text-secondary)'
              }} />
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
                ORCHESTRIX V1.0
              </span>
            </div>

            <h1 style={{
              fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 700,
              letterSpacing: '-0.03em', lineHeight: 1.1,
              color: 'var(--text-primary)', marginBottom: 16
            }}>
              Research Intelligence.
            </h1>

            <p style={{
              fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.6,
              marginBottom: 40, maxWidth: 500, margin: '0 auto 40px'
            }}>
              Execute agentic discovery pipelines to retrieve, analyze, and synthesize literature.
            </p>
          </>
        )}

        {/* Search bar */}
        <div style={{
          background: 'var(--bg-surface)',
          border: `1px solid ${focused ? 'var(--text-secondary)' : 'var(--border-color)'}`,
          borderRadius: 8,
          transition: 'all 0.3s'
        }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            gap: 12, padding: '12px 16px'
          }}>
            {loading ? <LoadingSpinner /> : <span className="mono-text" style={{fontSize: 10, color: 'var(--text-muted)'}}>[Q]</span>}
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onSearch()}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Initialize search pipeline (e.g. LLM routing, synthetic data generation)"
              disabled={loading}
              style={{
                flex: 1, background: 'transparent', border: 'none',
                outline: 'none', fontSize: 14, color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)'
              }}
            />
            <button
              onClick={() => onSearch()}
              disabled={!query.trim() || loading}
              className="mono-text"
              style={{
                padding: '6px 14px', borderRadius: 4, fontSize: 11,
                fontWeight: 700,
                cursor: !query.trim() || loading ? 'not-allowed' : 'pointer',
                background: !query.trim() || loading ? 'var(--bg-primary)' : 'var(--text-primary)',
                border: '1px solid',
                borderColor: !query.trim() || loading ? 'var(--border-color)' : 'var(--text-primary)',
                color: !query.trim() || loading ? 'var(--text-muted)' : 'var(--bg-primary)',
                transition: 'all var(--trans-fast)', whiteSpace: 'nowrap'
              }}>
              {loading ? 'EXECUTING' : 'EXECUTE'}
            </button>
          </div>

          <div style={{
            borderTop: '1px solid var(--border-color)',
            padding: '8px 16px',
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <span className="mono-text" style={{
              fontSize: 10, color: 'var(--text-muted)',
              fontWeight: 600, letterSpacing: '0.05em'
            }}>
              NAMESPACE
            </span>
            <input
              value={sessionName}
              onChange={e => setSessionName(e.target.value)}
              placeholder="default_session"
              style={{
                flex: 1, background: 'transparent', border: 'none',
                outline: 'none', fontSize: 12, color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)'
              }}
            />
          </div>
        </div>

        {/* Suggestions */}
        {!collapsed && (
          <div style={{
            display: 'flex', gap: 8, marginTop: 24,
            flexWrap: 'wrap', justifyContent: 'center'
          }}>
            {SUGGESTIONS.map(s => (
              <button key={s}
                onClick={() => { setQuery(s); setTimeout(() => onSearch(s), 50) }}
                style={{
                  padding: '4px 12px', borderRadius: 4, fontSize: 11,
                  background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s',
                  fontFamily: 'var(--font-sans)'
                }}
                onMouseEnter={e => {
                  e.target.style.borderColor = 'var(--text-secondary)'
                  e.target.style.color = 'var(--text-primary)'
                }}
                onMouseLeave={e => {
                  e.target.style.borderColor = 'var(--border-color)'
                  e.target.style.color = 'var(--text-muted)'
                }}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div style={{
      width: 14, height: 14, borderRadius: '50%',
      border: '2px solid var(--border-color)',
      borderTopColor: 'var(--text-secondary)',
      animation: 'spin 0.8s linear infinite',
      flexShrink: 0
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}