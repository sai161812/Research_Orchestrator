import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#12121f', border: '1px solid #1e1e35',
      borderRadius: 8, padding: '10px 14px'
    }}>
      <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#6366f1', fontWeight: 700, fontSize: 16 }}>
        {payload[0].value} papers
      </div>
    </div>
  )
}

export default function TrendChart({ data }) {
  if (!data?.length) return <EmptyChart message="No trend data" />

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e35" vertical={false} />
        <XAxis
          dataKey="year"
          tick={{ fill: '#475569', fontSize: 11 }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          tick={{ fill: '#475569', fontSize: 11 }}
          axisLine={false} tickLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone" dataKey="count"
          stroke="#6366f1" strokeWidth={2.5}
          fill="url(#trendGrad)"
          dot={{ fill: '#6366f1', strokeWidth: 0, r: 4 }}
          activeDot={{ r: 6, fill: '#a5b4fc' }}
          animationDuration={800}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function EmptyChart({ message }) {
  return (
    <div style={{
      height: 260, display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: '#2a2a4a', fontSize: 13
    }}>
      {message}
    </div>
  )
}