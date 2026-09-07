'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface ComparisonBarProps {
  data: { key: string; label: string; pre: number | null; post: number | null }[]
}

export default function ComparisonBarChart({ data }: ComparisonBarProps) {
  const chartData = data.map((d) => ({
    name: d.label,
    'Pre-test': d.pre ?? 0,
    'Post-test': d.post ?? 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} barGap={4} barSize={28}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eaeaea" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#666666' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: '#999999' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #eaeaea',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value) => [`${value ?? 0}%`]}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Bar dataKey="Pre-test" fill="#9333ea" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Post-test" fill="#16a34a" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
