const AGENT_CONFIG = {
  orchestrator: { label: 'Orchestrator', color: '#f59e0b', icon: '⚙' },
  discovery:    { label: 'Discovery',    color: '#6366f1', icon: '🔍' },
  analysis:     { label: 'Analysis',     color: '#06b6d4', icon: '📊' },
  citation:     { label: 'Citation',     color: '#10b981', icon: '"' },
  summarization:{ label: 'Summarization',color: '#f472b6', icon: '✦' },
}

const STATUS_CONFIG = {
  running: { color: '#f59e0b', dot: 'pulse' },
  done:    { color: '#10b981', dot: 'solid' },
  error:   { color: '#ef4444', dot: 'solid' },
}

export default function TracePanel({ trace, isOpen, onToggle }) {
  return (
    <>
      {/* Toggle button — always visible */}
      <button
        onClick={onToggle}
        style={{
          position: 'fixed', right: isOpen ? 316 : 16,
          top: '50%', transform: 'translateY(-50%)',
          zIndex: 100, width: 36, height: 72,
          background: '#0d0d1a', border: '1px solid #1e1e35',
          borderRadius: '8px 0 0 8px', cursor: 'pointer',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 4, transition: 'all 0.3s',
          color: '#6366f1'
        }}>
        <span style={{ fontSize: 14 }}>{isOpen ? '→' : '←'}</span>
        <span style={{
          fontSize: 9, fontWeight: 700, color: '#475569',
          writingMode: 'vertical-rl', textOrientation: 'mixed',
          letterSpacing: '0.1em'
        }}>
          TRACE
        </span>
      </button>

      {/* Panel */}
      <div style={{
        position: 'fixed', right: isOpen ? 0 : -320,
        top: 64, bottom: 0, width: 320,
        background: '#0a0a14', borderLeft: '1px solid #1e1e35',
        zIndex: 99, transition: 'right 0.35s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Panel header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #1e1e35',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>
              Execution Trace
            </div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
              {trace.length} step{trace.length !== 1 ? 's' : ''} logged
            </div>
          </div>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: trace.some(t => t.status === 'running') ? '#f59e0b' : '#10b981',
            boxShadow: trace.some(t => t.status === 'running')
              ? '0 0 8px #f59e0b' : '0 0 8px #10b981'
          }} />
        </div>

        {/* Steps */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0', position: 'relative' }}>
          
          {/* Flowing Trace Light */}
          {trace.some(t => t.status === 'running') && trace.length > 0 && (
            <div style={{
              position: 'absolute', top: 0, bottom: 0, left: 19, width: 2,
              background: 'linear-gradient(to bottom, transparent 0%, transparent 60%, rgba(99, 102, 241, 0.8) 95%, #fff 100%)',
              backgroundSize: '100% 300px',
              backgroundRepeat: 'repeat-y',
              animation: 'traceFlow 2s linear infinite',
              zIndex: 10, pointerEvents: 'none',
              filter: 'blur(1px)'
            }} />
          )}

          {trace.length === 0 ? (
            <div style={{
              padding: '40px 20px', textAlign: 'center',
              color: '#2a2a4a', fontSize: 13
            }}>
              Waiting for query...
            </div>
          ) : (
            trace.map((step, i) => {
              const agent = AGENT_CONFIG[step.agent] || AGENT_CONFIG.orchestrator
              const status = STATUS_CONFIG[step.status] || STATUS_CONFIG.done

              return (
                <div key={i} style={{
                  padding: '10px 20px',
                  borderLeft: `2px solid ${i === trace.length - 1 ? agent.color : '#1e1e35'}`,
                  marginLeft: 20, marginBottom: 4,
                  animation: 'slideIn 0.3s ease both',
                  animationDelay: `${i * 0.05}s`,
                  position: 'relative'
                }}>
                  {/* Point light for intersection */}
                  <div style={{
                    position: 'absolute', top: -1, left: -4, width: 6, height: 6,
                    borderRadius: '50%', background: '#fff',
                    boxShadow: `0 0 10px 2px ${agent.color}`,
                    zIndex: 20
                  }} />
                  {/* Step header */}
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    gap: 8, marginBottom: 4
                  }}>
                    <span style={{ fontSize: 12 }}>{agent.icon}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: agent.color, textTransform: 'uppercase',
                      letterSpacing: '0.08em'
                    }}>
                      {agent.label}
                    </span>
                    <div style={{
                      marginLeft: 'auto', width: 6, height: 6,
                      borderRadius: '50%', background: status.color,
                      boxShadow: step.status === 'running'
                        ? `0 0 6px ${status.color}` : 'none'
                    }} />
                  </div>

                  {/* Message */}
                  <div style={{
                    fontSize: 12, color: '#f1f5f9',
                    lineHeight: 1.6, fontFamily: 'monospace',
                    background: '#04040a', padding: '10px 14px',
                    borderRadius: 8, border: '1px solid #1e1e35',
                    marginTop: 8, borderLeft: '3px solid ' + agent.color
                  }}>
                    <span style={{color: '#6366f1', marginRight: 8}}>[{String(i).padStart(2,'0')}]</span>
                    {step.message}
                  </div>

                  {/* Duration */}
                  {step.duration && (
                    <div style={{
                      fontSize: 10, color: '#475569',
                      marginTop: 6, fontFamily: 'monospace',
                      textAlign: 'right'
                    }}>
                      [ EXEC_TIME: {step.duration}ms ]
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        <style>{`
          @keyframes slideIn {
            from { opacity: 0; transform: translateX(12px); }
            to   { opacity: 1; transform: translateX(0); }
          }
          @keyframes traceFlow {
            0% { background-position: 0 -100%; }
            100% { background-position: 0 200%; }
          }
        `}</style>
      </div>
    </>
  )
}