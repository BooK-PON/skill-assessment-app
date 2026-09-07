'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SURVEY_DIMENSIONS } from '@/lib/survey'
import { RefreshCw, Smile, BarChart3 } from 'lucide-react'
import Skeleton from '@/components/ui/Skeleton'
import SatisfactionBarChart from '@/components/charts/SatisfactionBarChart'

interface SurveyRow {
  dimension: string
  score: number
  course_id: string
  user_id: string
  courses?: { title: string }[] | { title: string } | null
}

function courseTitleOf(c: SurveyRow['courses']): string {
  if (!c) return ''
  return Array.isArray(c) ? c[0]?.title || '' : c.title
}

interface DimStat {
  key: string
  label: string
  avg: number
  count: number
}

interface CourseStat {
  courseTitle: string
  dims: DimStat[]
}

function computeStats(rows: SurveyRow[]) {
  return SURVEY_DIMENSIONS.map((d) => {
    const withDim = rows.filter((r) => r.dimension === d.key)
    const avg = withDim.length
      ? withDim.reduce((sum, r) => sum + r.score, 0) / withDim.length
      : 0
    return { key: d.key, label: d.label, avg, count: withDim.length }
  })
}

export default function AdminSatisfactionPage() {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<SurveyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('satisfaction_surveys')
      .select('dimension, score, course_id, user_id, courses (title)')
    if (err) {
      setError(err.message)
    } else {
      setRows(data ?? [])
      setUpdatedAt(new Date().toLocaleString('th-TH'))
      setError(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { void fetchAll() }, 0)
    return () => clearTimeout(t)
  }, [fetchAll])

  const overall = computeStats(rows)

  // แยกตามคอร์ส
  const courseMap = new Map<string, SurveyRow[]>()
  rows.forEach((r) => {
    const key = courseTitleOf(r.courses) || r.course_id
    const list = courseMap.get(key) || []
    list.push(r)
    courseMap.set(key, list)
  })
  const perCourse: CourseStat[] = Array.from(courseMap.entries())
    .map(([title, list]) => ({ courseTitle: title, dims: computeStats(list) }))
    .sort((a, b) => b.dims.length - a.dims.length)

  const responseCount = new Set(rows.map((r) => `${r.user_id}-${r.course_id}`)).size
  const overallAvg = overall.length
    ? overall.reduce((s, d) => s + d.avg, 0) / overall.length
    : 0

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 text-xs font-bold mb-2">
              <Smile className="w-3.5 h-3.5" /> รายงานผู้ดูแลระบบ
            </span>
            <h1 className="text-2xl font-bold text-ink">แบบประเมินความพึงพอใจ</h1>
            <p className="text-sm text-secondary mt-1">ข้อมูลเรียลไทม์จากผู้เรียนทุกวิชา (คะแนนเต็ม 5)</p>
          </div>
          <button
            onClick={fetchAll}
            className="inline-flex items-center gap-2 bg-white hover:bg-surface border border-border text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            <RefreshCw className="w-4 h-4" />
            รีเฟรช
          </button>
        </div>

        {error && (
          <div role="alert" className="bg-rose-500/10 border border-rose-500/30 text-rose-600 text-sm rounded-xl p-4">
            เกิดข้อผิดพลาดในการโหลดข้อมูล: {error}
          </div>
        )}

        {loading ? (
          <div className="py-8 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20 bg-white border border-border rounded-xl">
            <Smile className="w-12 h-12 text-muted mx-auto mb-3" />
            <p className="text-secondary text-sm">ยังไม่มีผู้เรียนตอบแบบประเมิน</p>
          </div>
        ) : (
          <>
            {/* KPI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-border rounded-xl p-4 shadow-sm">
                <p className="text-xs text-secondary">ผู้ตอบแบบประเมิน</p>
                <p className="text-3xl font-bold text-ink mt-1">{responseCount} <span className="text-xs text-secondary font-normal">คน</span></p>
              </div>
              <div className="bg-white border border-border rounded-xl p-4 shadow-sm">
                <p className="text-xs text-secondary">คะแนนเฉลี่ยรวม</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{overallAvg.toFixed(2)} <span className="text-xs text-secondary font-normal">/ 5</span></p>
              </div>
              <div className="bg-white border border-border rounded-xl p-4 shadow-sm">
                <p className="text-xs text-secondary">ข้อความประเมินทั้งหมด</p>
                <p className="text-3xl font-bold text-ink mt-1">{rows.length}</p>
              </div>
              <div className="bg-white border border-border rounded-xl p-4 shadow-sm">
                <p className="text-xs text-secondary">อัปเดตล่าสุด</p>
                <p className="text-sm font-semibold text-ink mt-2">{updatedAt || '-'}</p>
              </div>
            </div>

            {/* กราฟรวมทุกคอร์ส */}
            <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-amber-600" />
                <h2 className="font-bold text-ink">ค่าเฉลี่ยความพึงพอใจรายด้าน (ภาพรวม)</h2>
              </div>
              <SatisfactionBarChart data={overall} />
              <div className="grid md:grid-cols-5 gap-3 mt-5">
                {overall.map((d) => (
                  <div key={d.key} className="bg-surface border border-border rounded-lg p-3 text-center">
                    <p className="text-[11px] text-secondary mb-1 leading-tight min-h-[28px]">{d.label}</p>
                    <p className="text-xl font-bold text-amber-600">
                      {d.count > 0 ? d.avg.toFixed(1) : '-'}
                      <span className="text-[10px] text-secondary font-normal">/5</span>
                    </p>
                    <p className="text-[10px] text-muted mt-0.5">{d.count} คำตอบ</p>
                  </div>
                ))}
              </div>
            </div>

            {/* แยกตามคอร์ส */}
            <div>
              <h2 className="font-bold text-ink mb-3">รายละเอียดรายวิชา</h2>
              <div className="space-y-4">
                {perCourse.map((c) => {
                  const courseAvg = c.dims.reduce((s, d) => s + d.avg, 0) / c.dims.length || 0
                  return (
                    <div key={c.courseTitle} className="bg-white border border-border rounded-xl p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-ink text-sm">{c.courseTitle}</h3>
                        <span className="text-xs bg-amber-500/15 text-amber-600 px-2.5 py-1 rounded-full font-bold">
                          {courseAvg.toFixed(2)}/5
                        </span>
                      </div>
                      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
                        {c.dims.map((d) => (
                          <div key={d.key} className="bg-surface border border-border rounded-lg p-3">
                            <p className="text-[11px] text-secondary mb-2 leading-tight min-h-[28px]">{d.label}</p>
                            <div className="h-2 bg-white rounded-full overflow-hidden mb-1.5">
                              <div
                                className="h-full bg-amber-500 rounded-full transition-all"
                                style={{ width: `${(d.avg / 5) * 100}%` }}
                              />
                            </div>
                            <p className="text-xs text-ink font-bold">
                              {d.count > 0 ? `${d.avg.toFixed(1)}/5` : '-'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  )
}