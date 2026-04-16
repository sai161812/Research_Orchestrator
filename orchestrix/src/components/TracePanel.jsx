const AGENT_CONFIG = {
  orchestrator: { label: 'Orchestrator', icon: 'SYS' },
  discovery:    { label: 'Discovery',    icon: 'FND' },
  analysis:     { label: 'Analysis',     icon: 'ANL' },
  citation:     { label: 'Citation',     icon: 'CIT' },
  summarization:{ label: 'Summarization',icon: 'SUM' },
}

export default function TracePanel({ trace, isOpen }) {
  const isActive = trace.some(t => t.status === 'running')

  return (
    <div style={{
      width: isOpen ? 300 : 0,
      minWidth: isOpen ? 300 : 0,
      background: 'var(--bg-panel)',
      borderRight: isOpen ? '1px solid var(--border-color)' : 'none',
      transition: 'width var(--trans-base), min-width var(--trans-base)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      height: '100vh', position: 'sticky', top: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        minWidth: 300
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Execution Trace
          </div>
          <div className="mono-text" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
            {trace.length} step{trace.length !== 1 ? 's' : ''} logged
          </div>
        </div>
        {isActive && (
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--text-secondary)',
            animation: 'tracePulse 2s ease infinite'
          }} />
        )}
      </div>

      {/* Steps */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0', minWidth: 300 }}>
        {trace.length === 0 ? (
          <div style={{
            padding: '40px 18px', textAlign: 'center',
            color: 'var(--text-muted)', fontSize: 12
          }}>
            Awaiting pipeline execution.
          </div>
        ) : (
          trace.map((step, i) => {
            const agent = AGENT_CONFIG[step.agent] || AGENT_CONFIG.orchestrator
            const isLast = i === trace.length - 1

            return (
              <div key={i} style={{
                padding: '8px 18px',
                borderLeft: `2px solid ${isLast ? 'var(--text-secondary)' : 'var(--border-color)'}`,
                marginLeft: 18, marginBottom: 4,
                animation: 'traceSlide 0.3s cubic-bezier(0.4, 0, 0.2, 1) both',
                animationDelay: `${i * 0.04}s`,
                opacity: 0, transform: 'translateY(6px)'
              }}>
                {/* Agent label */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4
                }}>
                  <span className="mono-text" style={{ 
                    fontSize: 9, fontWeight: 700, 
                    color: 'var(--text-muted)', 
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    padding: '1px 5px', borderRadius: 3,
                    letterSpacing: '0.04em'
                  }}>
                    {agent.icon}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    color: 'var(--text-muted)', textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}>
                    {agent.label}
                  </span>
                </div>

                {/* Message */}
                <div className="mono-text" style={{
                  fontSize: 11, color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                  padding: '8px 12px',
                  background: 'var(--bg-primary)',
                  borderRadius: 4, border: '1px solid var(--border-color)',
                }}>
                  {step.message}
                </div>

                {step.duration && (
                  <div className="mono-text" style={{
                    fontSize: 9, color: 'var(--text-muted)',
                    marginTop: 4, textAlign: 'right'
                  }}>
                    {step.duration}ms
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <style>{`
        @keyframes traceSlide {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes tracePulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}