'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface SatisfactionBarProps {
  data: { key: string; label: string; avg: number; count: number }[]
}

const COLORS = ['#d97706', '#f59e0b', '#fbbf24', '#fcd34d', '#fde68a']

export default function SatisfactionBarChart({ data }: SatisfactionBarProps) {
  const chartData = data.map((d) => ({
    name: d.label,
    avg: Number(d.avg.toFixed(2)),
    count: d.count,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} barSize={36}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eaeaea" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#666666' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 5]}
          tick={{ fontSize: 10, fill: '#999999' }}
          axisLine={false}
          tickLine={false}
          tickCount={6}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #eaeaea',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value, _name, props) => [
            `${value ?? 0} / 5 (${(props?.payload as { count?: number })?.count ?? 0} คำตอบ)`,
            'ค่าเฉลี่ย',
          ]}
        />
        <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
          {chartData.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
