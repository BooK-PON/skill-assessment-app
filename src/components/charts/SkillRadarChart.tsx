'use client'

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

interface SkillRadarProps {
  data: { key: string; label: string; pre: number | null; post: number | null }[]
}

export default function SkillRadarChart({ data }: SkillRadarProps) {
  // ข้ามด้านที่ยังไม่มีข้อสอบเลย (ไม่มีทั้ง pre/post) และไม่บีบ null ให้เป็น 0
  // เพื่อไม่ให้กราฟดูเหมือนผู้เรียนตอบผิดหมดในด้านที่ยังไม่มีข้อมูล
  const chartData = data
    .filter((d) => d.pre !== null || d.post !== null)
    .map((d) => ({
      dimension: d.label,
      'Pre-test': d.pre ?? undefined,
      'Post-test': d.post ?? undefined,
    }))

  return (
    <ResponsiveContainer width="100%" height={350}>
      <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="75%">
        <PolarGrid stroke="#eaeaea" />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fontSize: 11, fill: '#666666' }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: '#999999' }}
          tickCount={6}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #eaeaea',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value) => [value === null || value === undefined ? '-' : `${value}%`]}
        />
        <Legend
          wrapperStyle={{ fontSize: '12px' }}
        />
        <Radar
          name="Pre-test"
          dataKey="Pre-test"
          stroke="#9333ea"
          fill="#9333ea"
          fillOpacity={0.15}
          strokeWidth={2}
        />
        <Radar
          name="Post-test"
          dataKey="Post-test"
          stroke="#16a34a"
          fill="#16a34a"
          fillOpacity={0.15}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
