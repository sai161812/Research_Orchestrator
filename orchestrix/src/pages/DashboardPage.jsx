import { useState } from 'react'
import { getSessions } from '../store/sessionStore'
import TrendChart from '../components/charts/TrendChart'
import AuthorsChart from '../components/charts/AuthorsChart'
import KeywordChart from '../components/charts/KeywordChart'
import CitationChart from '../components/charts/CitationChart'
import EmergingTopics from '../components/charts/EmergingTopics'

function ChartCard({ title, subtitle, children }) {
  return (
    <div style={{
      background: '#0d0d1a',
      border: '1px solid #1e1e35',
      borderRadius: 16, padding: 24,
      transition: 'border-color 0.2s'
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#2a2a4a'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#1e1e35'}
    >
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 14, fontWeight: 700,
          color: '#f1f5f9', marginBottom: 4
        }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 12, color: '#475569' }}>{subtitle}</div>
        )}
      </div>
      {children}
    </div>
  )
}

export default function DashboardPage() {
  const sessions = getSessions()
  const [selectedId, setSelectedId] = useState(sessions[0]?.id || null)
  const selected = sessions.find(s => s.id === selectedId)
  const analyses = selected?.analyses || {}

  return (
    <div style={{ minHeight: '100vh', background: '#04040a', padding: '40px 24px 80px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 36, flexWrap: 'wrap', gap: 16
        }}>
          <div>
            <h1 style={{
              fontSize: 28, fontWeight: 700, color: '#f1f5f9',
              letterSpacing: '-0.02em', marginBottom: 6
            }}>
              Analysis Dashboard
            </h1>
            <p style={{ color: '#475569', fontSize: 14 }}>
              Full interactive analysis of your research sessions
            </p>
          </div>

          {/* Session selector */}
          {sessions.length > 0 && (
            <select
              value={selectedId || ''}
              onChange={e => setSelectedId(e.target.value)}
              style={{
                background: '#0d0d1a', border: '1px solid #1e1e35',
                borderRadius: 10, padding: '10px 16px', color: '#f1f5f9',
                fontSize: 13, outline: 'none', cursor: 'pointer',
                minWidth: 260
              }}>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name || s.query} — {new Date(s.timestamp).toLocaleDateString()}
                </option>
              ))}
            </select>
          )}
        </div>

        {sessions.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '100px 24px',
            background: '#0d0d1a', borderRadius: 16,
            border: '1px solid #1e1e35'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <div style={{
              fontSize: 18, fontWeight: 600,
              color: '#f1f5f9', marginBottom: 8
            }}>
              No sessions yet
            </div>
            <p style={{ color: '#475569', fontSize: 14 }}>
              Run a research query first, then come back here to see the analysis.
            </p>
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 14, marginBottom: 28
            }}>
              {[
                {
                  label: 'Total Papers',
                  value: selected?.papers?.length || 0,
                  color: '#6366f1', icon: '📄'
                },
                {
                  label: 'Avg Citations',
                  value: analyses.averageCitations || 0,
                  color: '#06b6d4', icon: '↑'
                },
                {
                  label: 'Year Range',
                  value: analyses.yearRange
                    ? `${analyses.yearRange.min}–${analyses.yearRange.max}`
                    : '—',
                  color: '#10b981', icon: '📅'
                },
                {
                  label: 'Top Keyword',
                  value: analyses.keywordFrequency?.[0]?.word || '—',
                  color: '#f59e0b', icon: '🔑'
                },
                {
                  label: 'Top Author',
                  value: analyses.topAuthors?.[0]?.name?.split(' ').pop() || '—',
                  color: '#f472b6', icon: '👤'
                },
              ].map(stat => (
                <div key={stat.label} style={{
                  background: '#0d0d1a',
                  border: '1px solid #1e1e35',
                  borderRadius: 12, padding: '18px 20px',
                  transition: 'all 0.2s'
                }}>
                  <div style={{
                    fontSize: 11, color: '#475569',
                    fontWeight: 600, letterSpacing: '0.05em',
                    marginBottom: 8, textTransform: 'uppercase'
                  }}>
                    {stat.icon} {stat.label}
                  </div>
                  <div style={{
                    fontSize: 22, fontWeight: 700,
                    color: stat.color, letterSpacing: '-0.02em'
                  }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Charts grid */}
            {!analyses.publicationTrend ? (
              <div style={{
                textAlign: 'center', padding: '60px 24px',
                background: '#0d0d1a', borderRadius: 16,
                border: '1px solid #1e1e35', color: '#475569', fontSize: 14
              }}>
                ⚠️ This session has no analysis data.
                The orchestrator may have decided analysis wasn't needed,
                or try running a topic/trend query.
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 20
              }}>
                {/* Publication Trend — full width */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <ChartCard
                    title="Publication Volume Trend"
                    subtitle="Number of papers published per year"
                  >
                    <TrendChart data={analyses.publicationTrend} />
                  </ChartCard>
                </div>

                {/* Top Authors */}
                <ChartCard
                  title="Top Contributing Authors"
                  subtitle="By number of papers in results"
                >
                  <AuthorsChart data={analyses.topAuthors} />
                </ChartCard>

                {/* Citation Distribution */}
                <ChartCard
                  title="Citation Impact Distribution"
                  subtitle="Papers grouped by citation count"
                >
                  <CitationChart data={analyses.citationDistribution} />
                </ChartCard>

                {/* Keyword Treemap — full width */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <ChartCard
                    title="Keyword & Topic Frequency"
                    subtitle="Most common terms across all abstracts"
                  >
                    <KeywordChart data={analyses.keywordFrequency} />
                  </ChartCard>
                </div>

                {/* Emerging Topics */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <ChartCard
                    title="Emerging Sub-topics"
                    subtitle={`Trending terms from papers in last 2 years`}
                  >
                    <EmergingTopics
                      data={analyses.emergingTopics}
                      yearRange={analyses.yearRange}
                    />
                  </ChartCard>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}