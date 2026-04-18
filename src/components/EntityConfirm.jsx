import { useState } from 'react'

export default function EntityConfirm({ intent, onConfirm, onCancel }) {
  const [topics, setTopics] = useState(intent.subTopics || [])
  const [custom, setCustom] = useState('')

  const toggle = (topic) => {
    setTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    )
  }

  const addCustom = () => {
    if (!custom.trim()) return
    setTopics(prev => [...prev, custom.trim()])
    setCustom('')
  }

  return (
    <div style={{
      maxWidth: 600, margin: '32px auto',
      background: '#0d0d1a',
      border: '1px solid #f59e0b40',
      borderRadius: 16, padding: 32,
      boxShadow: '0 0 40px rgba(245,158,11,0.08)',
      animation: 'fadeSlideUp 0.4s ease both'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        gap: 12, marginBottom: 24
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: '#f59e0b15',
          border: '1px solid #f59e0b30',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 18
        }}>⚡</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>
            Entity Query Detected
          </div>
          <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 2 }}>
            Type: {intent.entityType}
          </div>
        </div>
      </div>

      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>
        I've expanded your query into research sub-topics.
        Toggle the ones you want to search, or add your own.
      </p>

      {/* Topic chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
        {topics.map(topic => (
          <button key={topic} onClick={() => toggle(topic)} style={{
            padding: '8px 16px', borderRadius: 20, fontSize: 13,
            fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
            background: '#f59e0b15',
            border: '1px solid #f59e0b50',
            color: '#fbbf24'
          }}>
            ✓ {topic}
          </button>
        ))}
      </div>

      {/* Add custom topic */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 28
      }}>
        <input
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCustom()}
          placeholder="Add a custom topic..."
          style={{
            flex: 1, background: '#12121f',
            border: '1px solid #1e1e35', borderRadius: 8,
            padding: '8px 14px', color: '#f1f5f9',
            fontSize: 13, outline: 'none'
          }}
        />
        <button onClick={addCustom} style={{
          padding: '8px 16px', borderRadius: 8, fontSize: 13,
          background: '#f59e0b15', border: '1px solid #f59e0b40',
          color: '#fbbf24', cursor: 'pointer', fontWeight: 600
        }}>
          + Add
        </button>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => onConfirm(topics)}
          disabled={topics.length === 0}
          style={{
            flex: 1, padding: '12px 24px', borderRadius: 10,
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            background: topics.length === 0
              ? '#1e1e35'
              : 'linear-gradient(135deg, #f59e0b, #f59e0bcc)',
            border: 'none',
            color: topics.length === 0 ? '#475569' : '#0a0a0f',
            boxShadow: topics.length === 0
              ? 'none' : '0 4px 20px rgba(245,158,11,0.3)',
            transition: 'all 0.2s'
          }}>
          Confirm & Search ({topics.length} topics) →
        </button>
        <button onClick={onCancel} style={{
          padding: '12px 20px', borderRadius: 10, fontSize: 14,
          background: 'transparent', border: '1px solid #1e1e35',
          color: '#64748b', cursor: 'pointer'
        }}>
          Cancel
        </button>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}