import { useState } from 'react'
import CitationAgent from '../agents/CitationAgent'
import SummarizationAgent from '../agents/SummarizationAgent'

const SOURCE_CONFIG = {
  semanticscholar: { label: 'Semantic Scholar', color: '#6366f1', short: 'SS' },
  arxiv: { label: 'arXiv', color: '#06b6d4', short: 'arXiv' },
}

export default function PaperCard({ paper, index, citations, onSelect, isSelected, sessionId }) {
  const [expanded, setExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState('abstract')
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryLength, setSummaryLength] = useState('medium')
  const [citeStyle, setCiteStyle] = useState('APA')
  const [copied, setCopied] = useState(false)

  const src = SOURCE_CONFIG[paper.source] || SOURCE_CONFIG.arxiv
  const cite = citations?.[paper.id]

  const handleSummarize = async (length = summaryLength) => {
  setSummaryLoading(true)
  setActiveTab('summary')
  const result = await SummarizationAgent.summarizePaper(paper, length)
  setSummary(result)
  setSummaryLoading(false)

  // Save summary back to session in localStorage
  if (result && sessionId) {
    const { updateSession, getSessionById } = await import('../store/sessionStore')
    const session = getSessionById(sessionId)
    if (session) {
      const updatedSummaries = { ...session.summaries, [paper.id]: result }
      updateSession(sessionId, { summaries: updatedSummaries })
    }
  }
}

  const handleCopy = () => {
    navigator.clipboard.writeText(cite?.[citeStyle] || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExportTxt = () => {
    if (cite) CitationAgent.exportTxt([paper], { [paper.id]: cite })
  }

  const handleExportBib = () => {
    if (cite) CitationAgent.exportBib([paper], { [paper.id]: cite })
  }

  return (
    <div
      style={{
        background: '#0d0d1a',
        border: `1px solid ${isSelected ? '#6366f160' : expanded ? '#2a2a4a' : '#1e1e35'}`,
        borderRadius: 16,
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        transform: 'translateY(0)',
        animation: `fadeSlideUp 0.4s ease both`,
        animationDelay: `${index * 0.06}s`,
        boxShadow: expanded
          ? '0 8px 32px rgba(99,102,241,0.1)'
          : '0 2px 8px rgba(0,0,0,0.3)',
      }}
      onMouseEnter={e => {
        if (!expanded) e.currentTarget.style.borderColor = '#2a2a4a'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        if (!expanded) e.currentTarget.style.borderColor = isSelected ? '#6366f160' : '#1e1e35'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Card Header */}
      <div style={{ padding: '20px 24px' }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', gap: 16, marginBottom: 12
        }}>
          {/* Left — badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '3px 10px',
              borderRadius: 6, background: `${src.color}15`,
              border: `1px solid ${src.color}30`, color: src.color,
              letterSpacing: '0.05em'
            }}>
              {src.short}
            </span>
            {paper.year && (
              <span style={{
                fontSize: 11, color: '#475569', padding: '3px 10px',
                background: '#12121f', borderRadius: 6,
                border: '1px solid #1e1e35'
              }}>
                {paper.year}
              </span>
            )}
            {paper.subTopic && (
              <span style={{
                fontSize: 11, color: '#f59e0b', padding: '3px 10px',
                background: '#f59e0b10', borderRadius: 6,
                border: '1px solid #f59e0b30'
              }}>
                {paper.subTopic}
              </span>
            )}
          </div>

          {/* Right — score + select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{
              fontSize: 11, color: '#10b981', fontWeight: 600,
              background: '#10b98110', border: '1px solid #10b98120',
              padding: '3px 10px', borderRadius: 6
            }}>
              ★ {paper.relevanceScore?.toFixed(2) || '—'}
            </div>
            <button
              onClick={() => onSelect?.(paper)}
              style={{
                padding: '4px 12px', borderRadius: 6, fontSize: 11,
                fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                background: isSelected ? '#6366f125' : 'transparent',
                border: `1px solid ${isSelected ? '#6366f160' : '#1e1e35'}`,
                color: isSelected ? '#a5b4fc' : '#64748b',
              }}>
              {isSelected ? '✓ Selected' : 'Select'}
            </button>
          </div>
        </div>

        {/* Title */}
        <h3
          onClick={() => setExpanded(!expanded)}
          style={{
            fontSize: 15, fontWeight: 600, color: '#f1f5f9',
            lineHeight: 1.5, marginBottom: 10, cursor: 'pointer',
            display: '-webkit-box', WebkitLineClamp: expanded ? 'unset' : 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
          {paper.title}
        </h3>

        {/* Authors + citations */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: 8
        }}>
          <div style={{ fontSize: 12, color: '#475569' }}>
            {paper.authors?.slice(0, 3).map(a => a.name).join(', ')}
            {paper.authors?.length > 3 && ` +${paper.authors.length - 3} more`}
          </div>
          {paper.citationCount > 0 && (
            <div style={{
              fontSize: 12, color: '#06b6d4', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4
            }}>
              ↑ {paper.citationCount.toLocaleString()} citations
            </div>
          )}
        </div>

        {/* Abstract preview — fades out */}
        {!expanded && (
          <div style={{ position: 'relative', marginTop: 12 }}>
            <p style={{
              fontSize: 13, color: '#64748b', lineHeight: 1.7,
              display: '-webkit-box', WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical', overflow: 'hidden'
            }}>
              {paper.abstract}
            </p>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div style={{
        padding: '10px 24px',
        borderTop: '1px solid #1e1e35',
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap'
      }}>
        <button onClick={() => { setExpanded(!expanded); setActiveTab('abstract') }} style={btnStyle('#6366f1')}>
          {expanded ? '↑ Collapse' : '↓ Expand'}
        </button>
        <button onClick={() => { setExpanded(true); handleSummarize() }} style={btnStyle('#06b6d4')}>
          ✦ Summarize
        </button>
        <button onClick={() => { setExpanded(true); setActiveTab('cite') }} style={btnStyle('#10b981')}>
          Cite
        </button>
        <a href={paper.url} target="_blank" rel="noopener noreferrer" style={{
          ...btnStyle('#f59e0b'), textDecoration: 'none'
        }}>
          ↗ Open
        </a>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ borderTop: '1px solid #1e1e35' }}>

          {/* Tabs */}
          <div style={{
            display: 'flex', gap: 4, padding: '12px 24px 0',
            borderBottom: '1px solid #1e1e35'
          }}>
            {['abstract', 'summary', 'cite'].map(tab => (
              <button key={tab} onClick={() => {
                setActiveTab(tab)
                if (tab === 'summary') handleSummarize()
              }} style={{
                padding: '8px 16px', borderRadius: '8px 8px 0 0',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                textTransform: 'capitalize', transition: 'all 0.2s',
                background: activeTab === tab ? '#12121f' : 'transparent',
                border: activeTab === tab ? '1px solid #1e1e35' : '1px solid transparent',
                borderBottom: activeTab === tab ? '1px solid #12121f' : '1px solid transparent',
                color: activeTab === tab ? '#f1f5f9' : '#475569',
                marginBottom: -1
              }}>
                {tab === 'abstract' ? '📄 Abstract' : tab === 'summary' ? '✦ Summary' : 'Cite'}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ padding: '20px 24px' }}>

            {/* Abstract tab */}
            {activeTab === 'abstract' && (
              <p style={{
                fontSize: 13, color: '#94a3b8', lineHeight: 1.8
              }}>
                {paper.abstract || 'No abstract available.'}
              </p>
            )}

            {/* Summary tab */}
            {activeTab === 'summary' && (
  <div>
    {/* Length selector */}
    <div style={{
      display: 'flex', gap: 8, marginBottom: 16,
      alignItems: 'center'
    }}>
      <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>
        LENGTH:
      </span>
      {['short', 'medium', 'detailed'].map(len => (
        <button key={len} onClick={() => {
          setSummaryLength(len)
          setSummary(null)
          handleSummarize(len)
        }} style={{
          padding: '5px 14px', borderRadius: 20, fontSize: 11,
          fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
          background: summaryLength === len ? '#6366f115' : 'transparent',
          border: `1px solid ${summaryLength === len ? '#6366f140' : '#1e1e35'}`,
          color: summaryLength === len ? '#a5b4fc' : '#475569',
          textTransform: 'capitalize'
        }}>
          {len === 'short' ? '⚡ Short' : len === 'medium' ? '📄 Medium' : '📚 Detailed'}
        </button>
      ))}
    </div>

    {summaryLoading ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[100, 80, 90, 70, 85].map((w, i) => (
          <div key={i} style={{
            height: 14, borderRadius: 6,
            background: '#1e1e35', width: `${w}%`,
            animation: 'pulse 1.5s ease infinite',
            animationDelay: `${i * 0.1}s`
          }} />
        ))}
        <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
          Generating {summaryLength} summary...
        </div>
      </div>
    ) : (
      <div style={{
        fontSize: 13, color: '#94a3b8',
        lineHeight: 1.9, whiteSpace: 'pre-wrap'
      }}>
        {summary}
      </div>
    )}
  </div>
)}

            {/* Citation tab */}
            {activeTab === 'cite' && (
              <div>
                {/* Style selector */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {['APA', 'MLA', 'IEEE', 'Chicago'].map(style => (
                    <button key={style} onClick={() => setCiteStyle(style)} style={{
                      padding: '6px 14px', borderRadius: 8, fontSize: 12,
                      fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                      background: citeStyle === style ? '#6366f120' : 'transparent',
                      border: `1px solid ${citeStyle === style ? '#6366f160' : '#1e1e35'}`,
                      color: citeStyle === style ? '#a5b4fc' : '#64748b'
                    }}>
                      {style}
                    </button>
                  ))}
                </div>

                {/* Citation text */}
                <div style={{
                  background: '#12121f', borderRadius: 10,
                  padding: 16, fontSize: 13, color: '#94a3b8',
                  lineHeight: 1.7, fontFamily: 'monospace',
                  border: '1px solid #1e1e35', marginBottom: 12
                }}>
                  {cite?.[citeStyle] || 'Citation unavailable for this paper.'}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button onClick={handleCopy} disabled={!cite?.[citeStyle]} style={{
                  ...btnStyle('#6366f1'),
                  padding: '8px 20px',
                  fontSize: 13,
                  fontWeight: 700,
                  opacity: cite?.[citeStyle] ? 1 : 0.5,
                  cursor: cite?.[citeStyle] ? 'pointer' : 'not-allowed'
                }}>
                  {copied ? '✓ Copied!' : 'Copy Citation'}
                </button>
                <div style={{ height: 20, width: 1, background: '#1e1e35' }} />
                <span style={{ fontSize: 11, color: '#475569' }}>Export:</span>
                <button onClick={handleExportTxt} disabled={!cite} style={{
                  ...btnStyle('#06b6d4'),
                  opacity: cite ? 1 : 0.5,
                  cursor: cite ? 'pointer' : 'not-allowed'
                }}>
                  .txt
                </button>
                <button onClick={handleExportBib} disabled={!cite} style={{
                  ...btnStyle('#10b981'),
                  opacity: cite ? 1 : 0.5,
                  cursor: cite ? 'pointer' : 'not-allowed'
                }}>
                  .bib
                </button>
              </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }s
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}

function btnStyle(color) {
  return {
    padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.2s',
    background: `${color}10`, border: `1px solid ${color}30`,
    color: color
  }
}