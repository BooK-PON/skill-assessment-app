import { TriangleAlert } from 'lucide-react'
import type { SkillDim } from '@/lib/survey'

// ด้านที่ยังไม่มีข้อสอบเลย (0 ข้อทั้ง pre/post) — ไม่ควรถูกนับเป็น 0%
export function missingSkillLabels(dims: SkillDim[]): string[] {
  return dims.filter((d) => d.preCount + d.postCount === 0).map((d) => d.label)
}

interface SkillDimCardsProps {
  dims: SkillDim[]
}

export default function SkillDimCards({ dims }: SkillDimCardsProps) {
  const missing = missingSkillLabels(dims)

  return (
    <>
      {missing.length > 0 && (
        <p className="mt-4 flex items-start gap-2 text-xs text-amber-700 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            ยังไม่มีข้อสอบใน {missing.length} ด้าน ({missing.join(', ')}) — กราฟจะไม่แสดงด้านเหล่านี้
            เพื่อไม่ให้สับสนว่าผู้เรียนตอบผิดทั้งหมด ผู้สอนสามารถเพิ่มข้อสอบให้ครบทั้ง 5 ด้านได้ที่หน้าจัดการข้อสอบ
          </span>
        </p>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
        {dims.map((d) => {
          const total = d.preCount + d.postCount
          return (
            <div
              key={d.key}
              className={`border rounded-xl p-3 ${
                total === 0 ? 'bg-amber-500/5 border-amber-500/20' : 'bg-surface border-border'
              }`}
            >
              <p className="text-[11px] text-ink font-medium mb-1">{d.label}</p>
              <p className="text-[10px] text-muted mb-2">{total} ข้อ</p>
              <div className="flex gap-3 text-[10px]">
                <span className="text-purple-600 font-bold">Pre {d.pre !== null ? `${d.pre}%` : '-'}</span>
                <span className="text-emerald-600 font-bold">Post {d.post !== null ? `${d.post}%` : '-'}</span>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}