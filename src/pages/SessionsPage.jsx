import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSessions, deleteSession, updateSession, setActiveSessionId } from '../store/sessionStore'
import CitationAgent from '../agents/CitationAgent'

export default function SessionsPage() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState(getSessions())
  const [editingNote, setEditingNote] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [compareIds, setCompareIds] = useState([])
  const [pdfStyle, setPdfStyle] = useState('APA')

  const refresh = () => setSessions(getSessions())

  const handleDelete = (id) => {
    deleteSession(id)
    refresh()
  }

  const handleLoad = (id) => {
    setActiveSessionId(id)
    navigate('/')
  }

  const handleSaveNote = (id) => {
    updateSession(id, { notes: noteText })
    setEditingNote(null)
    refresh()
  }

  const toggleCompare = (id) => {
    setCompareIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : prev.length < 2 ? [...prev, id] : prev
    )
  }

  const compareSession = sessions.filter(s => compareIds.includes(s.id))

  return (
    <div style={{ minHeight: '100vh', background: '#04040a', padding: '40px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 32
        }}>
          <div>
            <h1 style={{
              fontSize: 28, fontWeight: 700, color: '#f1f5f9',
              letterSpacing: '-0.02em', marginBottom: 8
            }}>
              Research Sessions
            </h1>
            <p style={{ color: '#475569', fontSize: 14 }}>
              {sessions.length} saved session{sessions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
              <span style={{ fontWeight: 500 }}>PDF citation style:</span>
              <select
                value={pdfStyle}
                onChange={e => setPdfStyle(e.target.value)}
                style={{
                  background: '#0d0d1a',
                  border: '1px solid #1e1e35',
                  borderRadius: 8,
                  padding: '6px 10px',
                  color: '#e5e7eb',
                  fontSize: 12,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="APA">APA</option>
                <option value="MLA">MLA</option>
                <option value="IEEE">IEEE</option>
                <option value="Chicago">Chicago</option>
              </select>
            </div>
          </div>
          {compareIds.length === 2 && (
            <button
              onClick={() => setCompareIds([])}
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 13,
                background: '#6366f120', border: '1px solid #6366f140',
                color: '#a5b4fc', cursor: 'pointer', fontWeight: 600
              }}>
              Clear Compare
            </button>
          )}
        </div>

        {sessions.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 24px',
            background: '#0d0d1a', borderRadius: 16,
            border: '1px solid #1e1e35'
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🗂️</div>
            <p style={{ color: '#475569', fontSize: 16 }}>
              No sessions yet. Run a research query to create one.
            </p>
          </div>
        ) : (
          <>
            {/* Compare view */}
            {compareIds.length === 2 && (
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: 16, marginBottom: 32
              }}>
                {compareSession.map(s => (
                  <div key={s.id} style={{
                    background: '#0d0d1a', border: '1px solid #6366f140',
                    borderRadius: 16, padding: 24
                  }}>
                    <div style={{ fontSize: 13, color: '#6366f1', fontWeight: 600, marginBottom: 8 }}>
                      Comparing
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 16 }}>
                      {s.name || s.query}
                    </div>
                    {[
                      { label: 'Papers', value: s.papers?.length || 0 },
                      { label: 'Avg Citations', value: s.analyses?.averageCitations || 0 },
                      { label: 'Mode', value: s.mode || 'direct' },
                      { label: 'Top Keyword', value: s.analyses?.keywordFrequency?.[0]?.word || '—' },
                    ].map(row => (
                      <div key={row.label} style={{
                        display: 'flex', justifyContent: 'space-between',
                        padding: '8px 0', borderBottom: '1px solid #1e1e35',
                        fontSize: 13
                      }}>
                        <span style={{ color: '#475569' }}>{row.label}</span>
                        <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Session cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sessions.map(session => (
                <div key={session.id} style={{
                  background: '#0d0d1a',
                  border: `1px solid ${compareIds.includes(session.id) ? '#6366f160' : '#1e1e35'}`,
                  borderRadius: 16, padding: 24,
                  transition: 'all 0.2s'
                }}>
                  {/* Top row */}
                  <div style={{
                    display: 'flex', alignItems: 'flex-start',
                    justifyContent: 'space-between', marginBottom: 12
                  }}>
                    <div>
                      <div style={{
                        fontSize: 16, fontWeight: 700,
                        color: '#f1f5f9', marginBottom: 4
                      }}>
                        {session.name || session.query}
                      </div>
                      <div style={{ fontSize: 12, color: '#475569' }}>
                        {new Date(session.timestamp).toLocaleString()} ·{' '}
                        <span style={{
                          color: session.mode === 'entity' ? '#f59e0b' : '#6366f1'
                        }}>
                          {session.mode === 'entity' ? '⚡ Entity' : '🔬 Direct'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => CitationAgent.exportSessionPdf(session, pdfStyle)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          fontSize: 12,
                          background: '#6366f120',
                          border: '1px solid #6366f140',
                          color: '#a5b4fc',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}>
                        Export PDF
                      </button>
                      <button
                        onClick={() => handleLoad(session.id)}
                        style={{
                          padding: '6px 12px', borderRadius: 8, fontSize: 12,
                          background: '#10b98120', border: '1px solid #10b98140',
                          color: '#34d399', cursor: 'pointer', fontWeight: 600
                        }}>
                        Load
                      </button>
                      <button
                        onClick={() => toggleCompare(session.id)}
                        style={{
                          padding: '6px 12px', borderRadius: 8, fontSize: 12,
                          background: compareIds.includes(session.id) ? '#6366f120' : 'transparent',
                          border: '1px solid #1e1e35', color: '#94a3b8',
                          cursor: 'pointer', fontWeight: 500
                        }}>
                        {compareIds.includes(session.id) ? '✓ Comparing' : 'Compare'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingNote(session.id)
                          setNoteText(session.notes || '')
                        }}
                        style={{
                          padding: '6px 12px', borderRadius: 8, fontSize: 12,
                          background: 'transparent', border: '1px solid #1e1e35',
                          color: '#94a3b8', cursor: 'pointer'
                        }}>
                        Note
                      </button>
                      <button
                        onClick={() => handleDelete(session.id)}
                        style={{
                          padding: '6px 12px', borderRadius: 8, fontSize: 12,
                          background: 'transparent', border: '1px solid #1e1e35',
                          color: '#ef4444', cursor: 'pointer'
                        }}>
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                    {[
                      { label: 'Papers', value: session.papers?.length || 0 },
                      { label: 'Avg Citations', value: session.analyses?.averageCitations || 0 },
                      { label: 'Top Keyword', value: session.analyses?.keywordFrequency?.[0]?.word || '—' },
                    ].map(stat => (
                      <div key={stat.label} style={{
                        background: '#12121f', borderRadius: 8,
                        padding: '8px 14px', fontSize: 12
                      }}>
                        <span style={{ color: '#475569' }}>{stat.label}: </span>
                        <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{stat.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Note editor */}
                  {editingNote === session.id && (
                    <div style={{ marginTop: 12 }}>
                      <textarea
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                        placeholder="Add your notes here..."
                        rows={3}
                        style={{
                          width: '100%', background: '#12121f',
                          border: '1px solid #1e1e35', borderRadius: 8,
                          padding: 12, color: '#f1f5f9', fontSize: 13,
                          outline: 'none', resize: 'vertical',
                          fontFamily: 'inherit'
                        }}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button onClick={() => handleSaveNote(session.id)} style={{
                          padding: '6px 16px', borderRadius: 8, fontSize: 12,
                          background: '#6366f1', border: 'none',
                          color: 'white', cursor: 'pointer', fontWeight: 600
                        }}>
                          Save
                        </button>
                        <button onClick={() => setEditingNote(null)} style={{
                          padding: '6px 16px', borderRadius: 8, fontSize: 12,
                          background: 'transparent', border: '1px solid #1e1e35',
                          color: '#94a3b8', cursor: 'pointer'
                        }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Existing note */}
                  {session.notes && editingNote !== session.id && (
                    <div style={{
                      marginTop: 12, padding: 12, background: '#12121f',
                      borderRadius: 8, fontSize: 13, color: '#94a3b8',
                      borderLeft: '3px solid #6366f1'
                    }}>
                      {session.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}