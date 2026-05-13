import { useState, useEffect } from 'react'
import LearningAgent from '../agents/LearningAgent'

export default function MentorPanel({ paper, onClose }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchMentorData() {
      setLoading(true)
      const res = await LearningAgent.generateLearningPath(paper)
      if (res.error) {
        setError(res.error)
      } else {
        setData(res)
      }
      setLoading(false)
    }
    fetchMentorData()
  }, [paper])

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
      background: '#04040a', borderLeft: '1px solid #1e1e35',
      boxShadow: '-10px 0 40px rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', flexDirection: 'column',
      animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      {/* Header */}
      <div style={{
        padding: '24px', borderBottom: '1px solid #1e1e35',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>🎓</span>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
              AI Mentor
            </h2>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              Learning Path Generator
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', color: '#64748b',
          fontSize: 20, cursor: 'pointer'
        }}>✕</button>
      </div>

      {/* Content */}
      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div>
            <div style={{
              fontSize: 14, color: '#f59e0b', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24
            }}>
              <span style={{ animation: 'pulse 1.5s infinite' }}>●</span>
              Analyzing paper geometry...
            </div>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{
                height: 60, background: '#12121f', borderRadius: 12,
                marginBottom: 16, animation: 'pulse 2s infinite',
                animationDelay: `${i * 0.2}s`
              }} />
            ))}
          </div>
        ) : error ? (
          <div style={{ color: '#ef4444', fontSize: 14 }}>
            {error}
          </div>
        ) : data ? (
          <div style={{ animation: 'fadeSlideUp 0.4s ease' }}>
            {/* Prerequisite Glossary */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{
                fontSize: 14, fontWeight: 700, color: '#94a3b8',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                marginBottom: 16
              }}>Key Concepts Glossary</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {data.key_concepts?.map((c, i) => (
                  <div key={i} style={{
                    background: '#12121f', border: '1px solid #1e1e35',
                    borderRadius: 8, padding: '12px 16px', width: '100%'
                  }}>
                    <strong style={{ color: '#a5b4fc', fontSize: 14, display: 'block', marginBottom: 6 }}>
                      {c.concept}
                    </strong>
                    <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
                      {c.explanation}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Learning Path */}
            <div>
              <h3 style={{
                fontSize: 14, fontWeight: 700, color: '#94a3b8',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                marginBottom: 16
              }}>Recommended Learning Path</h3>
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Timeline line */}
                <div style={{
                  position: 'absolute', left: 16, top: 20, bottom: 20,
                  width: 2, background: '#1e1e35', zIndex: 0
                }} />
                
                {data.learning_path?.map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: 16, position: 'relative', zIndex: 1 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: '#04040a', border: '2px solid #6366f1',
                      color: '#6366f1', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 14, fontWeight: 700,
                      flexShrink: 0, marginTop: 4
                    }}>
                      {step.step}
                    </div>
                    <div style={{
                      background: '#6366f110', border: '1px solid #6366f130',
                      borderRadius: 12, padding: 16, flex: 1
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 6 }}>
                        {step.topic}
                      </div>
                      <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6 }}>
                        {step.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
      
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
