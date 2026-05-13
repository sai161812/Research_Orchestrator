import { useState, useEffect } from 'react'
import LearningAgent from '../agents/LearningAgent'

export default function MentorPanel({ paper, onClose }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function fetch() {
      setLoading(true)
      setData(null)
      setError(null)
      const res = await LearningAgent.generateLearningPath(paper)
      if (cancelled) return
      if (res.error) setError(res.error)
      else setData(res)
      setLoading(false)
    }
    fetch()
    return () => { cancelled = true }
  }, [paper?.id])

  if (loading) {
    return (
      <div>
        <div className="mono-text" style={{
          fontSize: 11, color: 'var(--text-muted)', marginBottom: 20,
          animation: 'mentorPulse 1.5s infinite'
        }}>
          Analyzing paper structure...
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} style={{
            height: 56, background: 'var(--bg-surface)', borderRadius: 6,
            marginBottom: 12, animation: 'mentorPulse 2s infinite',
            animationDelay: `${i * 0.15}s`,
            border: '1px solid var(--border-color)'
          }} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="mono-text" style={{ 
        color: 'var(--text-muted)', fontSize: 12, 
        padding: 20, background: 'var(--bg-primary)', 
        borderRadius: 6, border: '1px solid var(--border-color)' 
      }}>
        Error generating learning path: {error}
      </div>
    )
  }

  if (!data) return null

  return (
    <div style={{ animation: 'mentorFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) both' }}>
      
      {/* Key Concepts */}
      <div style={{ marginBottom: 28 }}>
        <div className="mono-text" style={{
          fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
          letterSpacing: '0.06em', marginBottom: 14
        }}>
          KEY CONCEPTS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.key_concepts?.map((c, i) => (
            <div key={i} style={{
              background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
              borderRadius: 6, padding: '12px 14px',
              transition: 'border-color 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-highlight)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                {c.concept}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {c.explanation}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Learning Path */}
      <div>
        <div className="mono-text" style={{
          fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
          letterSpacing: '0.06em', marginBottom: 14
        }}>
          LEARNING PROGRESSION
        </div>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Vertical timeline */}
          <div style={{
            position: 'absolute', left: 11, top: 14, bottom: 18,
            width: 1, background: 'var(--border-color)', zIndex: 0
          }} />
          
          {data.learning_path?.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, position: 'relative', zIndex: 1 }}>
              <div className="mono-text" style={{
                width: 24, height: 24, borderRadius: '50%',
                background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 10, fontWeight: 600,
                flexShrink: 0, marginTop: 2
              }}>
                {step.step}
              </div>
              <div style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                borderRadius: 6, padding: '12px 14px', flex: 1,
                transition: 'border-color 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-highlight)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {step.topic}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {step.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes mentorFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes mentorPulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
