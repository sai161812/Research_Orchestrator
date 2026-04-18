import { useState } from 'react'

const SUGGESTIONS = [
  'Large language models',
  'Transformer architecture',
  'Reinforcement learning from human feedback',
  'Neural radiance fields',
  'Diffusion models image generation',
]

const MODE_CONFIG = {
  direct: {
    label: 'Research Topic',
    placeholder: 'e.g. "AI in healthcare" or "quantum computing"',
    color: '#6366f1',
    icon: '🔬',
  },
  entity: {
    label: 'Entity Query',
    placeholder: 'e.g. "Elon Musk" or "OpenAI" or "Transformer"',
    color: '#f59e0b',
    icon: '⚡',
  },
}

export default function SearchBar({ onSearch, loading }) {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState('direct')
  const [sessionName, setSessionName] = useState('')
  const [focused, setFocused] = useState(false)

  const config = MODE_CONFIG[mode]

  const handleSubmit = () => {
    if (!query.trim() || loading) return
    onSearch(query.trim(), mode, sessionName.trim() || null)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>

      {/* Mode Toggle */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'center'
      }}>
        {Object.entries(MODE_CONFIG).map(([key, cfg]) => (
          <button key={key} onClick={() => setMode(key)} style={{
            padding: '8px 20px', borderRadius: 8, fontSize: 13,
            fontWeight: 600, cursor: 'pointer', transition: 'all 0.25s',
            background: mode === key ? `${cfg.color}20` : 'transparent',
            border: `1px solid ${mode === key ? cfg.color + '60' : '#1e1e35'}`,
            color: mode === key ? cfg.color : '#475569',
          }}>
            {cfg.icon} {cfg.label}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div style={{
        position: 'relative',
        borderRadius: 16,
        background: '#0d0d1a',
        border: `1.5px solid ${focused ? config.color + '80' : '#1e1e35'}`,
        boxShadow: focused ? `0 0 0 4px ${config.color}15, 0 20px 60px rgba(0,0,0,0.4)` : '0 4px 24px rgba(0,0,0,0.3)',
        transition: 'all 0.3s',
        padding: '4px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
          <span style={{ fontSize: 20 }}>🔍</span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            placeholder={config.placeholder}
            style={{
              flex: 1, background: 'transparent', border: 'none',
              outline: 'none', fontSize: 16, color: '#f1f5f9',
              caretColor: config.color,
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!query.trim() || loading}
            style={{
              padding: '10px 24px', borderRadius: 10,
              background: !query.trim() || loading
                ? '#1e1e35'
                : `linear-gradient(135deg, ${config.color}, ${config.color}cc)`,
              border: 'none', color: !query.trim() || loading ? '#475569' : 'white',
              fontWeight: 600, fontSize: 14, cursor: !query.trim() || loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s', whiteSpace: 'nowrap',
              boxShadow: !query.trim() || loading ? 'none' : `0 4px 20px ${config.color}40`
            }}>
            {loading ? 'Running...' : 'Orchestrate →'}
          </button>
        </div>

        {/* Session name input */}
        <div style={{
          borderTop: '1px solid #1e1e35',
          padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: 10
        }}>
          <span style={{ fontSize: 12, color: '#475569', whiteSpace: 'nowrap' }}>
            Session name:
          </span>
          <input
            value={sessionName}
            onChange={e => setSessionName(e.target.value)}
            placeholder="Optional — e.g. My AI Research"
            style={{
              flex: 1, background: 'transparent', border: 'none',
              outline: 'none', fontSize: 13, color: '#94a3b8',
            }}
          />
        </div>
      </div>

      {/* Suggestion chips */}
      <div style={{
        display: 'flex', gap: 8, marginTop: 16,
        flexWrap: 'wrap', justifyContent: 'center'
      }}>
        <span style={{ fontSize: 12, color: '#475569', alignSelf: 'center' }}>Try:</span>
        {SUGGESTIONS.map(s => (
          <button key={s} onClick={() => setQuery(s)} style={{
            padding: '4px 12px', borderRadius: 20, fontSize: 12,
            background: '#0d0d1a', border: '1px solid #1e1e35',
            color: '#64748b', cursor: 'pointer', transition: 'all 0.2s',
          }}
            onMouseEnter={e => {
              e.target.style.borderColor = config.color + '60'
              e.target.style.color = config.color
            }}
            onMouseLeave={e => {
              e.target.style.borderColor = '#1e1e35'
              e.target.style.color = '#64748b'
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}