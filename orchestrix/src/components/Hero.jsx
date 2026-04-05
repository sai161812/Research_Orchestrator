import { useEffect, useRef } from 'react'

export default function Hero({ onSearch }) {
  const canvasRef = useRef(null)

  // Animated grid background
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animFrame

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    let t = 0
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const spacing = 40
      const cols = Math.ceil(canvas.width / spacing)
      const rows = Math.ceil(canvas.height / spacing)

      for (let i = 0; i <= cols; i++) {
        for (let j = 0; j <= rows; j++) {
          const x = i * spacing
          const y = j * spacing
          const dist = Math.sqrt(
            Math.pow(x - canvas.width / 2, 2) +
            Math.pow(y - canvas.height / 2, 2)
          )
          const wave = Math.sin(dist / 60 - t) * 0.5 + 0.5
          const alpha = wave * 0.15
          ctx.beginPath()
          ctx.arc(x, y, 1.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(99,102,241,${alpha})`
          ctx.fill()
        }
      }
      t += 0.02
      animFrame = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animFrame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      minHeight: 420, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '80px 24px 60px',
    }}>
      {/* Animated canvas background */}
      <canvas ref={canvasRef} style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%', zIndex: 0
      }} />

      {/* Radial glow */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'radial-gradient(ellipse 80% 60% at 50% 50%, #6366f108 0%, transparent 70%)'
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 720 }}>

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: '#6366f110', border: '1px solid #6366f130',
          borderRadius: 20, padding: '6px 16px', marginBottom: 28
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#6366f1', boxShadow: '0 0 8px #6366f1'
          }} />
          <span style={{ fontSize: 12, color: '#a5b4fc', fontWeight: 500 }}>
            4-Agent Orchestration System
          </span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 'clamp(32px, 6vw, 64px)',
          fontWeight: 700,
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
          color: '#f1f5f9',
          marginBottom: 20
        }}>
          Research Intelligence,{' '}
          <span style={{
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Orchestrated.
          </span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: 18, color: '#64748b', lineHeight: 1.7,
          marginBottom: 48, maxWidth: 560, margin: '0 auto 48px'
        }}>
          Multi-agent AI that discovers, analyzes, cites, and synthesizes
          academic research — all in one coordinated pipeline.
        </p>

        {/* Agent pills */}
        <div style={{
          display: 'flex', gap: 10, justifyContent: 'center',
          flexWrap: 'wrap', marginBottom: 48
        }}>
          {[
            { label: 'Discovery', color: '#6366f1' },
            { label: 'Analysis', color: '#06b6d4' },
            { label: 'Citation', color: '#10b981' },
            { label: 'Summarization', color: '#f59e0b' },
          ].map(agent => (
            <div key={agent.label} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: `${agent.color}10`,
              border: `1px solid ${agent.color}30`,
              borderRadius: 20, padding: '4px 12px'
            }}>
              <div style={{
                width: 5, height: 5, borderRadius: '50%',
                background: agent.color
              }} />
              <span style={{ fontSize: 12, color: agent.color, fontWeight: 500 }}>
                {agent.label} Agent
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}