import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#12121f', border: '1px solid #1e1e35',
      borderRadius: 8, padding: '10px 14px'
    }}>
      <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>
        {payload[0].payload.name}
      </div>
      <div style={{ color: '#06b6d4', fontWeight: 700, fontSize: 16 }}>
        {payload[0].value} papers
      </div>
    </div>
  )
}

export default function AuthorsChart({ data }) {
  if (!data?.length) return (
    <div style={{
      height: 260, display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: '#2a2a4a', fontSize: 13
    }}>No author data</div>
  )

  const shortened = data.map(d => ({
    ...d,
    short: d.name.split(' ').pop()
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={shortened}
        layout="vertical"
        margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e35" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: '#475569', fontSize: 11 }}
          axisLine={false} tickLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category" dataKey="short" width={80}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={false} tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#6366f108' }} />
        <Bar dataKey="count" radius={[0, 6, 6, 0]} animationDuration={800}>
          {shortened.map((_, i) => (
            <Cell
              key={i}
              fill={`rgba(6,182,212,${1 - i * 0.08})`}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}