const COLORS = ['#6366f1','#06b6d4','#10b981','#f59e0b','#f472b6']

export default function EmergingTopics({ data, yearRange }) {
  if (!data?.length) return (
    <div style={{
      height: 200, display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: '#2a2a4a', fontSize: 13
    }}>No emerging topic data</div>
  )

  const max = data[0]?.count || 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
      {data.map((topic, i) => (
        <div key={topic.word}>
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 6
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 20, height: 20, borderRadius: 6,
                background: `${COLORS[i % COLORS.length]}20`,
                border: `1px solid ${COLORS[i % COLORS.length]}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700,
                color: COLORS[i % COLORS.length]
              }}>
                {i + 1}
              </span>
              <span style={{
                fontSize: 13, fontWeight: 600,
                color: '#f1f5f9', textTransform: 'capitalize'
              }}>
                {topic.word}
              </span>
              {i === 0 && (
                <span style={{
                  fontSize: 10, color: '#10b981',
                  background: '#10b98115', border: '1px solid #10b98130',
                  padding: '1px 8px', borderRadius: 10, fontWeight: 600
                }}>
                  🔥 Trending
                </span>
              )}
            </div>
            <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
              {topic.count}x
            </span>
          </div>

          {/* Progress bar */}
          <div style={{
            height: 4, background: '#1e1e35',
            borderRadius: 4, overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${(topic.count / max) * 100}%`,
              background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]}, ${COLORS[i % COLORS.length]}80)`,
              borderRadius: 4,
              transition: 'width 1s cubic-bezier(0.4,0,0.2,1)',
              animationDelay: `${i * 0.1}s`
            }} />
          </div>
        </div>
      ))}

      {yearRange && (
        <div style={{
          marginTop: 8, fontSize: 11, color: '#2a2a4a',
          borderTop: '1px solid #1e1e35', paddingTop: 10
        }}>
          Based on papers from {yearRange.max - 2}–{yearRange.max}
        </div>
      )}
    </div>
  )
}