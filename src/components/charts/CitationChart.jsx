import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'

const COLORS = ['#1e1e35', '#6366f140', '#6366f170', '#6366f1', '#a5b4fc', '#e0e7ff']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#12121f', border: '1px solid #1e1e35',
      borderRadius: 8, padding: '10px 14px'
    }}>
      <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>
        {label} citations
      </div>
      <div style={{ color: '#a5b4fc', fontWeight: 700, fontSize: 16 }}>
        {payload[0].value} papers
      </div>
    </div>
  )
}

export default function CitationChart({ data }) {
  if (!data?.length) return (
    <div style={{
      height: 260, display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: '#2a2a4a', fontSize: 13
    }}>No citation data</div>
  )

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e35" vertical={false} />
        <XAxis
          dataKey="range"
          tick={{ fill: '#475569', fontSize: 10 }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          tick={{ fill: '#475569', fontSize: 11 }}
          axisLine={false} tickLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#6366f108' }} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} animationDuration={800}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}