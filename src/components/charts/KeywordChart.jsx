import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS = [
  '#6366f1','#06b6d4','#10b981','#f59e0b',
  '#f472b6','#8b5cf6','#34d399','#fb923c',
  '#60a5fa','#a78bfa','#4ade80','#facc15'
]

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: '#12121f', border: '1px solid #1e1e35',
      borderRadius: 8, padding: '10px 14px'
    }}>
      <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13 }}>{d.word}</div>
      <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
        {d.count} occurrences
      </div>
    </div>
  )
}

const CustomContent = ({ x, y, width, height, index, word, count }) => {
  if (width < 30 || height < 20) return null
  const color = COLORS[index % COLORS.length]
  return (
    <g>
      <rect
        x={x + 2} y={y + 2}
        width={width - 4} height={height - 4}
        rx={8}
        fill={`${color}20`}
        stroke={`${color}60`}
        strokeWidth={1}
      />
      {width > 50 && height > 30 && (
        <>
          <text
            x={x + width / 2} y={y + height / 2 - 6}
            textAnchor="middle" fill={color}
            fontSize={Math.min(14, width / 6)}
            fontWeight={600}
          >
            {word}
          </text>
          <text
            x={x + width / 2} y={y + height / 2 + 12}
            textAnchor="middle" fill={`${color}80`}
            fontSize={10}
          >
            {count}
          </text>
        </>
      )}
    </g>
  )
}

export default function KeywordChart({ data }) {
  if (!data?.length) return (
    <div style={{
      height: 260, display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: '#2a2a4a', fontSize: 13
    }}>No keyword data</div>
  )

  const mapped = data.map(d => ({ ...d, size: d.count }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <Treemap
        data={mapped}
        dataKey="size"
        content={<CustomContent />}
        animationDuration={800}
      >
        <Tooltip content={<CustomTooltip />} />
      </Treemap>
    </ResponsiveContainer>
  )
}