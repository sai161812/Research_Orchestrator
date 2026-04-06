import { useState, useRef, useEffect } from 'react'
import { runOrchestrator, continueEntityRun } from '../orchestrator/Orchestrator'
import PaperCard from '../components/PaperCard'
import TracePanel from '../components/TracePanel'
import MentorPanel from '../components/MentorPanel'
import EntityConfirm from '../components/EntityConfirm'
import FilterBar from '../components/FilterBar'
import CitationAgent from '../agents/CitationAgent'
import { getSessionById, getActiveSessionId, setActiveSessionId } from '../store/sessionStore'

const SUGGESTIONS = [
  'AI in healthcare trends',
  'Recent advances in large language models',
  'Quantum computing algorithms',
  'Elon Musk',
  'OpenAI research',
  'Computer vision deep learning',
]

export default function ResearchPage() {
  const [query, setQuery] = useState('')
  const [sessionName, setSessionName] = useState('')
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState('idle')
  const [trace, setTrace] = useState([])
  const [traceOpen, setTraceOpen] = useState(false)
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

  return (
    <div style={{
      minHeight: '100vh', background: '#04040a',
      paddingRight: traceOpen ? 320 : 0,
      transition: 'padding-right 0.35s cubic-bezier(0.4,0,0.2,1)'
    }}>

      {/* ── HERO ── */}
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

      {/* ── LOADING ── */}
      {stage === 'loading' && (
        <div style={{
          maxWidth: 600, margin: '40px auto',
          textAlign: 'center', padding: '0 24px'
        }}>
          <div style={{
            background: '#0d0d1a', border: '1px solid #1e1e35',
            borderRadius: 16, padding: '32px 24px'
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              border: '3px solid #1e1e35', borderTopColor: '#6366f1',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px'
            }} />
            <div style={{ color: '#f1f5f9', fontWeight: 600, marginBottom: 8 }}>
              Orchestrating your research pipeline...
            </div>
            <div style={{ color: '#475569', fontSize: 13 }}>
              Fetching from Semantic Scholar + arXiv. This may take 10–20 seconds.
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      )}

      {/* ── ENTITY CONFIRM ── */}
      {stage === 'confirm' && intent && (
        <EntityConfirm
          intent={intent}
          onConfirm={handleEntityConfirm}
          onCancel={() => setStage('idle')}
        />
      )}

      {/* ── RESULTS ── */}
      {stage === 'results' && papers.length > 0 && (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 80px' }}>

          {/* Results header */}
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
            marginBottom: 20, paddingBottom: 16,
            borderBottom: '1px solid #1e1e35'
          }}>
            <div>
              <span style={{ fontSize: 13, color: '#475569' }}>
                {displayPapers.length} papers
                {filteredPapers.length > 0 ? ' (filtered)' : ' found'} for{' '}
              </span>
              <span style={{ fontSize: 13, color: '#a5b4fc', fontWeight: 600 }}>
                "{query}"
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {selectedPapers.length > 0 && (
                <div style={{
                  fontSize: 12, color: '#10b981', fontWeight: 600,
                  background: '#10b98110', border: '1px solid #10b98130',
                  padding: '4px 12px', borderRadius: 20
                }}>
                  {selectedPapers.length} selected
                </div>
              )}
              <button
                onClick={handleCompare}
                disabled={selectedPapers.length !== 2 || comparing}
                style={{
                  padding: '6px 16px', borderRadius: 8, fontSize: 12,
                  fontWeight: 600, cursor: selectedPapers.length === 2 ? 'pointer' : 'not-allowed', 
                  transition: 'all 0.2s',
                  background: selectedPapers.length === 2 ? '#6366f115' : 'transparent', 
                  border: `1px solid ${selectedPapers.length === 2 ? '#6366f150' : '#1e1e35'}`,
                  color: selectedPapers.length === 2 ? '#a5b4fc' : '#475569'
                }}>
                {comparing ? 'Comparing...' : '⚖ Compare (Select 2)'}
              </button>
            </div>
          </div>

          {/* Comparison Result Panel */}
          {compareResult && (
            <div style={{
              background: '#0d0d1a', border: '1px solid #6366f140',
              borderRadius: 12, padding: 20, marginBottom: 20,
              boxShadow: '0 4px 24px rgba(99,102,241,0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 15, color: '#f1f5f9', fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{color: '#6366f1'}}>⚖</span> Technical Comparison
                </h3>
                <button onClick={() => setCompareResult(null)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>✕</button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
                <div><strong style={{color: '#a5b4fc'}}>Summary Diff:</strong> {compareResult.summary_diff}</div>
                <div><strong style={{color: '#06b6d4'}}>Citation Impact:</strong> {compareResult.citation_comparison}</div>
                <div><strong style={{color: '#10b981'}}>Recency:</strong> {compareResult.recency_comparison}</div>
                <div style={{ marginTop: 8, padding: 12, background: '#12121f', borderRadius: 8, borderLeft: '3px solid #6366f1', color: '#f1f5f9' }}>
                  <strong>Key Takeaways:</strong> {compareResult.key_takeaways}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {displayPapers.map((paper, i) => (
              <PaperCard
                key={paper.id}
                paper={paper}
                index={i} 
                citations={citations}
                onSelect={handleSelect}
                onMentorRequest={(p) => setMentorPaper(p)}
                isSelected={selectedPapers.some(p => p.id === paper.id)}
                sessionId={sessionId}
              />
            ))}
          </div>

          {/* Load more */}
          {filteredPapers.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: 40 }}>
              <button onClick={loadMore} style={{
                padding: '12px 32px', borderRadius: 10, fontSize: 14,
                fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                background: 'transparent', border: '1px solid #1e1e35',
                color: '#64748b',
              }}
                onMouseEnter={e => {
                  e.target.style.borderColor = '#6366f160'
                  e.target.style.color = '#a5b4fc'
                }}
                onMouseLeave={e => {
                  e.target.style.borderColor = '#1e1e35'
                  e.target.style.color = '#64748b'
                }}>
                Load more papers →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── NO RESULTS ── */}
      {stage === 'results' && papers.length === 0 && fallbackExhausted && (
        <div style={{
          maxWidth: 560, margin: '40px auto', textAlign: 'center',
          padding: 32, background: '#0d0d1a',
          border: '1px solid #1e1e35', borderRadius: 16
        }}>
          <div style={{ color: '#f1f5f9', fontWeight: 600, marginBottom: 8 }}>
            No papers were returned.
          </div>
          <div style={{ color: '#64748b', fontSize: 13 }}>
            Try a broader query or different keywords.
          </div>
        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {stage === 'idle' && (
        <div style={{
          textAlign: 'center', padding: '20px 24px 80px',
          color: '#2a2a4a', fontSize: 13
        }}>
          Enter any research query above to begin
        </div>
      )}

      {/* ── ERROR ── */}
      {stage === 'error' && (
        <div style={{
          maxWidth: 500, margin: '40px auto', textAlign: 'center',
          padding: 32, background: '#0d0d1a',
          border: '1px solid #ef444430', borderRadius: 16
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <div style={{ color: '#ef4444', fontWeight: 600, marginBottom: 8 }}>
            Something went wrong
          </div>
          <div style={{ color: '#475569', fontSize: 13 }}>
            Check your Groq API key in .env and try again.
          </div>
        </div>
      )}

      {/* ── MENTOR PANEL ── */}
      {mentorPaper && (
        <MentorPanel
          paper={mentorPaper}
          onClose={() => setMentorPaper(null)}
        />
      )}

      {/* ── TRACE PANEL ── */}
      <TracePanel
        trace={trace}
        isOpen={traceOpen}
        onToggle={() => setTraceOpen(o => !o)}
      />
    </div>
  )
}

// ── Hero + Search ─────────────────────────────────────────────────────────────
function HeroSection({ query, setQuery, sessionName, setSessionName, onSearch, loading, stage, inputRef }) {
  const [focused, setFocused] = useState(false)
  const collapsed = stage !== 'idle'

  return (
    <div style={{
      padding: collapsed ? '40px 24px 32px' : '100px 24px 60px',
      transition: 'padding 0.5s cubic-bezier(0.4,0,0.2,1)',
      position: 'relative', overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse 70% 50% at 50% 0%, #6366f108 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 720, margin: '0 auto', textAlign: 'center'
      }}>
        {!collapsed && (
          <>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#6366f110', border: '1px solid #6366f125',
              borderRadius: 20, padding: '5px 14px', marginBottom: 28
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#6366f1', boxShadow: '0 0 8px #6366f1'
              }} />
              <span style={{ fontSize: 11, color: '#a5b4fc', fontWeight: 600, letterSpacing: '0.05em' }}>
                MULTI-AGENT RESEARCH PLATFORM
              </span>
            </div>

            <h1 style={{
              fontSize: 'clamp(28px, 5vw, 56px)', fontWeight: 700,
              letterSpacing: '-0.03em', lineHeight: 1.1,
              color: '#f1f5f9', marginBottom: 16
            }}>
              Research Intelligence,{' '}
              <span style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}>
                Orchestrated.
              </span>
            </h1>

            <p style={{
              fontSize: 16, color: '#475569', lineHeight: 1.7,
              marginBottom: 40, maxWidth: 500, margin: '0 auto 40px'
            }}>
              Ask anything. Our agents discover papers, analyze trends,
              generate citations and synthesize insights — automatically.
            </p>
          </>
        )}

        {/* Search bar */}
        <div style={{
          background: '#0d0d1a',
          border: `1.5px solid ${focused ? '#6366f180' : '#1e1e35'}`,
          borderRadius: 14,
          boxShadow: focused
            ? '0 0 0 4px #6366f112, 0 24px 64px rgba(0,0,0,0.5)'
            : '0 8px 32px rgba(0,0,0,0.4)',
          transition: 'all 0.3s',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            gap: 12, padding: '14px 20px'
          }}>
            {loading
              ? <LoadingSpinner />
              : <span style={{ fontSize: 18, opacity: 0.5 }}>🔍</span>
            }
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onSearch()}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder='Ask anything — "AI trends", "Elon Musk", "recent CV papers"...'
              disabled={loading}
              style={{
                flex: 1, background: 'transparent', border: 'none',
                outline: 'none', fontSize: 15, color: '#f1f5f9',
                caretColor: '#6366f1',
              }}
            />
            <button
              onClick={() => onSearch()}
              disabled={!query.trim() || loading}
              style={{
                padding: '9px 22px', borderRadius: 9, fontSize: 13,
                fontWeight: 700,
                cursor: !query.trim() || loading ? 'not-allowed' : 'pointer',
                background: !query.trim() || loading
                  ? '#1e1e35'
                  : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                border: 'none',
                color: !query.trim() || loading ? '#475569' : 'white',
                transition: 'all 0.2s', whiteSpace: 'nowrap',
                boxShadow: !query.trim() || loading
                  ? 'none' : '0 4px 16px #6366f140'
              }}>
              {loading ? 'Working...' : 'Run →'}
            </button>
          </div>

          <div style={{
            borderTop: '1px solid #1e1e35',
            padding: '9px 20px',
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <span style={{
              fontSize: 11, color: '#2a2a4a',
              fontWeight: 600, letterSpacing: '0.05em'
            }}>
              SESSION
            </span>
            <input
              value={sessionName}
              onChange={e => setSessionName(e.target.value)}
              placeholder="Name this session (optional)"
              style={{
                flex: 1, background: 'transparent', border: 'none',
                outline: 'none', fontSize: 12, color: '#64748b'
              }}
            />
          </div>
        </div>

        {/* Suggestions */}
        {!collapsed && (
          <div style={{
            display: 'flex', gap: 8, marginTop: 20,
            flexWrap: 'wrap', justifyContent: 'center'
          }}>
            {SUGGESTIONS.map(s => (
              <button key={s}
                onClick={() => { setQuery(s); setTimeout(() => onSearch(s), 50) }}
                style={{
                  padding: '5px 14px', borderRadius: 20, fontSize: 12,
                  background: 'transparent', border: '1px solid #1e1e35',
                  color: '#475569', cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.target.style.borderColor = '#6366f150'
                  e.target.style.color = '#a5b4fc'
                  e.target.style.background = '#6366f108'
                }}
                onMouseLeave={e => {
                  e.target.style.borderColor = '#1e1e35'
                  e.target.style.color = '#475569'
                  e.target.style.background = 'transparent'
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
      width: 18, height: 18, borderRadius: '50%',
      border: '2px solid #1e1e35',
      borderTopColor: '#6366f1',
      animation: 'spin 0.8s linear infinite',
      flexShrink: 0
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}