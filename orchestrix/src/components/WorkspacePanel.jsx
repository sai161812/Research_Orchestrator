import { useState, useEffect } from 'react'
import MentorPanel from './MentorPanel'
import CitationAgent from '../agents/CitationAgent'
import SummarizationAgent from '../agents/SummarizationAgent'

/* ── Typing effect hook ── */
function useTypingEffect(text, speed = 25) {
  const [displayed, setDisplayed] = useState('')
  const [idx, setIdx] = useState(0)

  useEffect(() => { setDisplayed(''); setIdx(0) }, [text])

  useEffect(() => {
    if (!text || idx >= text.length) return
    const t = setTimeout(() => {
      setDisplayed(p => p + text[idx])
      setIdx(p => p + 1)
    }, speed)
    return () => clearTimeout(t)
  }, [text, idx, speed])

  return { displayed, done: text ? idx >= text.length : true }
}

export default function WorkspacePanel({ 
  selectedPapers, 
  compareResult, 
  onTogglePaper,
  citations
}) {
  const [activePaperId, setActivePaperId] = useState(null)
  const [activeSubTab, setActiveSubTab] = useState('summary')

  // Summary state
  const [summaryLength, setSummaryLength] = useState('medium')
  const [summaryText, setSummaryText] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  // Citation state
  const [citeStyle, setCiteStyle] = useState('APA')
  const [copied, setCopied] = useState(false)

  const { displayed: typedSummary, done: typingDone } = useTypingEffect(summaryText, 20)

  // Auto-select newly added paper
  useEffect(() => {
    if (selectedPapers.length === 0) {
      setActivePaperId(null)
    } else if (!activePaperId || !selectedPapers.find(p => p.id === activePaperId)) {
      setActivePaperId(selectedPapers[selectedPapers.length - 1].id)
    }
  }, [selectedPapers, activePaperId])

  // Reset summary when switching papers
  useEffect(() => {
    setSummaryText(null)
    setSummaryLoading(false)
    setSummaryLength('medium')
  }, [activePaperId])

  const subTabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'citation', label: 'Citation' },
    { id: 'details', label: 'Details' },
    { id: 'mentor', label: 'Mentor Me' },
  ]

  const activePaper = selectedPapers.find(p => p.id === activePaperId)
  const cite = activePaper ? (citations?.[activePaper.id] || CitationAgent.generateAll(activePaper)) : null

  const handleSummarize = async (length) => {
    setSummaryLength(length)
    setSummaryLoading(true)
    setSummaryText(null)
    const result = await SummarizationAgent.summarizePaper(activePaper, length)
    setSummaryText(result)
    setSummaryLoading(false)
  }

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExportTxt = () => {
    if (cite && activePaper) CitationAgent.exportTxt([activePaper], { [activePaper.id]: cite })
  }

  const handleExportBib = () => {
    if (cite && activePaper) CitationAgent.exportBib([activePaper], { [activePaper.id]: cite })
  }

  return (
    <div style={{
      width: 440, minWidth: 440,
      background: 'var(--bg-panel)',
      borderLeft: '1px solid var(--border-color)',
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0
    }}>

      {/* ─── CHROME TAB BAR ─── */}
      <div style={{
        display: 'flex', alignItems: 'flex-end',
        padding: '10px 10px 0',
        background: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-color)',
        overflowX: 'auto', whiteSpace: 'nowrap',
        minHeight: 44, scrollbarWidth: 'none'
      }}>
        {selectedPapers.map(paper => {
          const isActive = paper.id === activePaperId
          return (
            <div
              key={paper.id}
              onClick={() => setActivePaperId(paper.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 12px',
                fontSize: 11, fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                background: isActive ? 'var(--bg-panel)' : 'transparent',
                border: '1px solid',
                borderColor: isActive ? 'var(--border-color) var(--border-color) transparent' : 'transparent',
                borderTopLeftRadius: 6, borderTopRightRadius: 6,
                marginBottom: -1,
                transition: 'all var(--trans-fast)',
                cursor: 'pointer', position: 'relative',
                maxWidth: 180, flexShrink: 0,
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-surface)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
            >
              {isActive && (
                <div style={{
                  position: 'absolute', top: -1, left: -1, right: -1, height: 2,
                  background: 'var(--text-secondary)', borderTopLeftRadius: 6, borderTopRightRadius: 6
                }} />
              )}
              <span style={{ 
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 
              }}>
                {paper.title}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onTogglePaper?.(paper) }}
                style={{
                  background: 'transparent', border: 'none', color: 'inherit',
                  cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center',
                  borderRadius: '50%', opacity: 0, fontSize: 10,
                  transition: 'opacity 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                onMouseLeave={e => e.currentTarget.style.opacity = 0}
              >
                x
              </button>
            </div>
          )
        })}
        {selectedPapers.length === 0 && (
          <div className="mono-text" style={{ padding: '8px 12px', fontSize: 11, color: 'var(--text-muted)' }}>
            NO ACTIVE TABS
          </div>
        )}
      </div>

      {activePaper ? (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          
          {/* ─── SUB-TABS ─── */}
          <div style={{
            display: 'flex', padding: '0 20px',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-panel)', gap: 0,
            alignItems: 'center'
          }}>
            {subTabs.map(tab => {
              const isActive = tab.id === activeSubTab
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  style={{
                    padding: '11px 14px',
                    fontSize: 11, fontWeight: isActive ? 600 : 400, cursor: 'pointer',
                    textTransform: 'uppercase', letterSpacing: '0.06em', transition: 'all 0.15s',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                    background: 'transparent', border: 'none', position: 'relative'
                  }}
                >
                  {tab.label}
                  {isActive && (
                    <div style={{ 
                      position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, 
                      background: 'var(--text-secondary)' 
                    }} />
                  )}
                </button>
              )
            })}
            
            <div style={{ flex: 1 }} />
            
            {activePaper.url && (
              <a href={activePaper.url} target="_blank" rel="noopener noreferrer" className="mono-text" style={{
                fontSize: 10, fontWeight: 600, padding: '4px 10px',
                borderRadius: 4, background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)', color: 'var(--text-muted)',
                textDecoration: 'none', cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-highlight)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-color)' }}
              >
                SOURCE
              </a>
            )}
          </div>

          {/* ─── CONTENT ─── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: 'var(--bg-panel)' }}>
            <div 
              key={`${activePaper.id}-${activeSubTab}`} 
              style={{ animation: 'wsSlideIn 0.25s cubic-bezier(0.4, 0, 0.2, 1) both' }}
            >

              {/* ════ SUMMARY TAB ════ */}
              {activeSubTab === 'summary' && (
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.35, marginBottom: 16, color: 'var(--text-primary)' }}>
                    {activePaper.title}
                  </h3>
                  
                  {/* Abstract */}
                  <div style={{ marginBottom: 24 }}>
                    <div className="mono-text" style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 10, letterSpacing: '0.06em' }}>
                      ABSTRACT
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                      {activePaper.abstract || 'No abstract available for this paper.'}
                    </div>
                  </div>

                  {/* AI Summary generation */}
                  <div style={{ 
                    padding: 20, background: 'var(--bg-primary)', borderRadius: 8, 
                    border: '1px solid var(--border-color)' 
                  }}>
                    <div className="mono-text" style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 14, letterSpacing: '0.06em' }}>
                      AI SYNTHESIS
                    </div>

                    {/* 3-level length selector */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                      {['short', 'medium', 'detailed'].map(len => (
                        <button key={len} onClick={() => handleSummarize(len)} style={{
                          padding: '6px 14px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                          cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize',
                          background: summaryLength === len && (summaryText || summaryLoading) ? 'var(--text-secondary)' : 'var(--bg-surface)',
                          border: '1px solid var(--border-color)',
                          color: summaryLength === len && (summaryText || summaryLoading) ? 'var(--bg-primary)' : 'var(--text-secondary)',
                        }}>
                          {len}
                        </button>
                      ))}
                    </div>

                    {/* Loading skeleton */}
                    {summaryLoading && (
                      <div>
                        <div className="mono-text" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                          Generating {summaryLength} summary...
                        </div>
                        {[100, 85, 92, 70, 88].map((w, i) => (
                          <div key={i} style={{
                            height: 10, borderRadius: 2, marginBottom: 8,
                            background: 'var(--border-color)', width: `${w}%`,
                            animation: 'wsPulse 1.5s ease infinite',
                            animationDelay: `${i * 0.12}s`
                          }} />
                        ))}
                      </div>
                    )}

                    {/* Typed summary output */}
                    {summaryText && !summaryLoading && (
                      <div style={{ 
                        fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, 
                        whiteSpace: 'pre-wrap', minHeight: 80 
                      }}>
                        {typedSummary}
                        {!typingDone && (
                          <span style={{ 
                            display: 'inline-block', width: 2, height: 14, 
                            background: 'var(--text-muted)', marginLeft: 2,
                            verticalAlign: 'text-bottom',
                            animation: 'wsBlink 1s step-end infinite' 
                          }} />
                        )}
                      </div>
                    )}

                    {!summaryText && !summaryLoading && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Select a length above to generate an AI-powered summary.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ════ CITATION TAB ════ */}
              {activeSubTab === 'citation' && cite && (
                <div>
                  {/* Format selector */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                    {['APA', 'MLA', 'IEEE', 'Chicago', 'bibtex'].map(style => (
                      <button key={style} onClick={() => setCiteStyle(style)} style={{
                        padding: '6px 12px', borderRadius: 4, fontSize: 11,
                        fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                        background: citeStyle === style ? 'var(--text-secondary)' : 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        color: citeStyle === style ? 'var(--bg-primary)' : 'var(--text-secondary)',
                        textTransform: citeStyle === 'bibtex' ? 'none' : 'uppercase'
                      }}>
                        {style === 'bibtex' ? 'BibTeX' : style}
                      </button>
                    ))}
                  </div>

                  {/* Citation output */}
                  <div className="mono-text" style={{ 
                    fontSize: 12, color: 'var(--text-primary)', 
                    background: 'var(--bg-primary)', padding: 20, 
                    borderRadius: 6, border: '1px solid var(--border-color)',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    lineHeight: 1.7, marginBottom: 16
                  }}>
                    {cite[citeStyle] || 'Citation not available for this format.'}
                  </div>

                  {/* Actions row */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => handleCopy(cite[citeStyle])} style={{
                      padding: '6px 14px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                      background: copied ? 'var(--text-secondary)' : 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      color: copied ? 'var(--bg-primary)' : 'var(--text-primary)',
                      cursor: 'pointer'
                    }}>
                      {copied ? 'Copied' : 'Copy'}
                    </button>

                    <div style={{ width: 1, height: 20, background: 'var(--border-color)' }} />

                    <span className="mono-text" style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em' }}>EXPORT</span>

                    <button onClick={handleExportTxt} style={{
                      padding: '6px 12px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                      background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)', cursor: 'pointer'
                    }}>
                      .txt
                    </button>
                    <button onClick={handleExportBib} style={{
                      padding: '6px 12px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                      background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)', cursor: 'pointer'
                    }}>
                      .bib
                    </button>
                  </div>
                </div>
              )}

              {/* ════ DETAILS TAB ════ */}
              {activeSubTab === 'details' && (
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {[
                    { label: 'Title', value: activePaper.title },
                    { label: 'Authors', value: activePaper.authors?.map(a => typeof a === 'string' ? a : a.name).join(', ') || 'Unknown' },
                    { label: 'Year', value: activePaper.year || 'N/A' },
                    { label: 'Citations', value: activePaper.citationCount?.toLocaleString() || '0' },
                    { label: 'Source', value: activePaper.source === 'arxiv' ? 'arXiv' : 'Semantic Scholar' },
                    { label: 'Relevance', value: activePaper.isExactMatch ? 'EXACT MATCH (1.00)' : (activePaper.relevanceScore?.toFixed(3) || 'N/A') },
                    { label: 'URL', value: activePaper.url || 'N/A', isLink: true },
                  ].map((item, i) => (
                    <div key={i} style={{ 
                      padding: '14px 0', 
                      borderBottom: '1px solid var(--border-color)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16
                    }}>
                      <span className="mono-text" style={{ 
                        fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, 
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                        flexShrink: 0, paddingTop: 2
                      }}>
                        {item.label}
                      </span>
                      {item.isLink && item.value !== 'N/A' ? (
                        <a href={item.value} target="_blank" rel="noopener noreferrer" style={{
                          fontSize: 12, color: 'var(--text-secondary)', textAlign: 'right',
                          wordBreak: 'break-all'
                        }}>
                          {item.value}
                        </a>
                      ) : (
                        <span style={{ textAlign: 'right', lineHeight: 1.5 }}>{item.value}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ════ MENTOR TAB ════ */}
              {activeSubTab === 'mentor' && (
                <MentorPanel paper={activePaper} onClose={() => {}} />
              )}

            </div>
          </div>
        </div>
      ) : (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 12,
          color: 'var(--text-muted)', padding: 40
        }}>
          <div className="mono-text" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em' }}>
            WORKSPACE EMPTY
          </div>
          <div style={{ fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>
            Click any paper card to open it here.
          </div>
        </div>
      )}

      <style>{`
        @keyframes wsSlideIn {
          from { opacity: 0; transform: translateX(8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes wsPulse {
          0%, 100% { opacity: 0.3; }
          50%      { opacity: 0.7; }
        }
        @keyframes wsBlink {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
