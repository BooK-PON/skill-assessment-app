'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SURVEY_DIMENSIONS } from '@/lib/survey'
import { RefreshCw, Smile, BarChart3, FileDown, Table2, Layers, ClipboardCheck } from 'lucide-react'
import Skeleton from '@/components/ui/Skeleton'
import SatisfactionBarChart from '@/components/charts/SatisfactionBarChart'
import { csvCell, downloadCsv } from '@/lib/csv'

type CourseRef = { title: string }[] | { title: string } | null | undefined

interface SurveyRow {
  dimension: string
  score: number
  course_id: string
  user_id: string
  courses?: CourseRef
}

interface PostTestRow {
  user_id: string
  course_id: string
  courses?: CourseRef
}

function courseTitleOf(c: CourseRef): string {
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
  courseId: string
  courseTitle: string
  n: number
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

interface FreqStat {
  key: string
  label: string
  counts: number[] // index 0..4 = คะแนน 1..5
  total: number
  mean: number
}

function computeFrequency(rows: SurveyRow[]): FreqStat[] {
  return SURVEY_DIMENSIONS.map((d) => {
    const scores = rows.filter((r) => r.dimension === d.key).map((r) => r.score)
    const counts = [0, 0, 0, 0, 0]
    scores.forEach((s) => {
      if (s >= 1 && s <= 5) counts[s - 1] += 1
    })
    const total = scores.length
    const mean = total ? scores.reduce((a, b) => a + b, 0) / total : 0
    return { key: d.key, label: d.label, counts, total, mean }
  })
}

function columnAvg(dims: DimStat[]): number {
  const withData = dims.filter((d) => d.count > 0)
  return withData.length ? withData.reduce((s, d) => s + d.avg, 0) / withData.length : 0
}

function groupUsersByCourse(rows: { user_id: string; course_id: string }[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  rows.forEach((r) => {
    const set = map.get(r.course_id) || new Set<string>()
    set.add(r.user_id)
    map.set(r.course_id, set)
  })
  return map
}

export default function AdminSatisfactionPage() {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<SurveyRow[]>([])
  const [postTestRows, setPostTestRows] = useState<PostTestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    const [surveyRes, postTestRes] = await Promise.all([
      supabase
        .from('satisfaction_surveys')
        .select('dimension, score, course_id, user_id, courses (title)'),
      supabase
        .from('assessment_scores')
        .select('user_id, course_id, courses (title)')
        .eq('assessment_type', 'posttest')
        .gt('total_questions', 0),
    ])
    if (surveyRes.error) {
      setError(surveyRes.error.message)
    } else if (postTestRes.error) {
      setError(postTestRes.error.message)
    } else {
      setRows((surveyRes.data ?? []) as SurveyRow[])
      setPostTestRows((postTestRes.data ?? []) as PostTestRow[])
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
    .map(([title, list]) => ({
      courseId: list[0].course_id,
      courseTitle: title,
      n: new Set(list.map((r) => r.user_id)).size,
      dims: computeStats(list),
    }))
    .sort((a, b) => b.n - a.n)

  const responseCount = new Set(rows.map((r) => `${r.user_id}-${r.course_id}`)).size

  // ฐานคำนวณอัตราการตอบ = นักเรียนที่ส่ง Post-test ของวิชานั้น (ตรงกับเงื่อนไขที่ระบบเปิดให้ทำแบบประเมิน)
  const eligibleTotal = new Set(postTestRows.map((r) => `${r.user_id}-${r.course_id}`)).size
  const eligibleByCourse = groupUsersByCourse(postTestRows)
  const respondedByCourse = groupUsersByCourse(rows)
  const overallRate = eligibleTotal > 0 ? (responseCount / eligibleTotal) * 100 : null

  // รวมวิชาที่มีผู้ตอบ ∪ วิชาที่มีผู้ทำ Post-test เพื่อไม่ให้วิชาที่ยังไม่มีใครตอบหายไปจากตาราง
  const rateRows = Array.from(new Set([...eligibleByCourse.keys(), ...respondedByCourse.keys()]))
    .map((courseId) => {
      const eligible = eligibleByCourse.get(courseId)?.size ?? 0
      const responded = respondedByCourse.get(courseId)?.size ?? 0
      return {
        courseId,
        title:
          perCourse.find((c) => c.courseId === courseId)?.courseTitle ||
          courseTitleOf(postTestRows.find((r) => r.course_id === courseId)?.courses) ||
          courseId,
        eligible,
        responded,
        rate: eligible > 0 ? (responded / eligible) * 100 : null,
      }
    })
    .sort(
      (a, b) =>
        b.eligible - a.eligible ||
        b.responded - a.responded ||
        a.title.localeCompare(b.title, 'th')
    )
  const overallAvg = overall.length
    ? overall.reduce((s, d) => s + d.avg, 0) / overall.length
    : 0
  const freqOverall = computeFrequency(rows)

  const exportCsv = () => {
    const lines: string[] = []
    const colHeaders = [...perCourse.map((c) => c.courseTitle), 'ภาพรวม']
    lines.push(['ด้าน', ...colHeaders.map(csvCell)].join(','))
    overall.forEach((d, i) => {
      const row = [csvCell(d.label)]
      perCourse.forEach((c) => {
        const cd = c.dims[i]
        row.push(cd.count > 0 ? `${cd.avg.toFixed(2)} (${cd.count})` : '-')
      })
      row.push(d.count > 0 ? `${d.avg.toFixed(2)} (${d.count})` : '-')
      lines.push(row.join(','))
    })
    lines.push('')
    lines.push(['ด้าน', '1', '2', '3', '4', '5', 'รวม', 'ค่าเฉลี่ย'].join(','))
    freqOverall.forEach((f) => {
      lines.push([csvCell(f.label), ...f.counts.map(String), String(f.total), f.mean.toFixed(2)].join(','))
    })
    lines.push('')
    lines.push(['รายวิชา', 'ผู้ทำ Post-test (ฐาน)', 'ผู้ตอบแบบประเมิน', 'อัตราการตอบ (%)'].join(','))
    rateRows.forEach((r) => {
      lines.push([
        csvCell(r.title),
        String(r.eligible),
        String(r.responded),
        r.rate === null ? '-' : r.rate.toFixed(2),
      ].join(','))
    })
    lines.push([
      csvCell('ภาพรวม'),
      String(eligibleTotal),
      String(responseCount),
      overallRate === null ? '-' : overallRate.toFixed(2),
    ].join(','))
    downloadCsv('satisfaction-summary.csv', lines)
  }

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
                <p className="text-[11px] text-muted mt-1">
                  {overallRate === null
                    ? 'ยังไม่มีผู้ส่ง Post-test'
                    : `จาก ${eligibleTotal} คนที่ทำ Post-test · ตอบกลับ ${overallRate.toFixed(1)}%`}
                </p>
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
                        <div>
                          <h3 className="font-semibold text-ink text-sm">{c.courseTitle}</h3>
                          <p className="text-[11px] text-muted mt-0.5">ผู้ตอบ {c.n} คน</p>
                        </div>
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

            {/* ตารางสรุปผลสำหรับเอกสาร */}
            <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-600" />
                  <h2 className="font-bold text-ink">ตารางสรุปผล (รายด้าน × รายวิชา)</h2>
                </div>
                <button
                  onClick={exportCsv}
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-ink text-sm font-medium px-4 py-2 rounded-lg transition"
                >
                  <FileDown className="w-4 h-4" /> Export CSV
                </button>
              </div>
              <p className="text-xs text-secondary mb-4">เซลล์แสดงค่าเฉลี่ย (x̄) และจำนวนผู้ตอบ (N) · คะแนนเต็ม 5</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface text-left text-xs text-secondary">
                      <th className="px-3 py-2 font-semibold border border-border whitespace-nowrap">ด้านการประเมิน</th>
                      {perCourse.map((c) => (
                        <th key={c.courseTitle} className="px-3 py-2 font-semibold border border-border min-w-[110px]">
                          <div>{c.courseTitle}</div>
                          <div className="font-normal text-muted">N = {c.n}</div>
                        </th>
                      ))}
                      <th className="px-3 py-2 font-semibold border border-border min-w-[100px]">
                        <div>ภาพรวม</div>
                        <div className="font-normal text-muted">N = {responseCount}</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {overall.map((d, i) => (
                      <tr key={d.key} className="hover:bg-surface/60">
                        <td className="px-3 py-2 border border-border text-ink font-medium">{d.label}</td>
                        {perCourse.map((c) => {
                          const cd = c.dims[i]
                          return (
                            <td key={c.courseTitle} className="px-3 py-2 border border-border text-center">
                              <div className="font-bold text-ink">{cd.count > 0 ? cd.avg.toFixed(2) : '-'}</div>
                              <div className="text-[10px] text-muted">(N = {cd.count})</div>
                            </td>
                          )
                        })}
                        <td className="px-3 py-2 border border-border text-center bg-amber-500/5">
                          <div className="font-bold text-amber-700">{d.count > 0 ? d.avg.toFixed(2) : '-'}</div>
                          <div className="text-[10px] text-muted">(N = {d.count})</div>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-surface">
                      <td className="px-3 py-2 border border-border font-bold text-ink">เฉลี่ยรวม</td>
                      {perCourse.map((c) => (
                        <td key={c.courseTitle} className="px-3 py-2 border border-border text-center font-bold text-ink">
                          {columnAvg(c.dims).toFixed(2)}
                        </td>
                      ))}
                      <td className="px-3 py-2 border border-border text-center font-bold text-amber-700">
                        {overallAvg.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ตารางความถี่คะแนน (1-5) */}
            <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Table2 className="w-5 h-5 text-amber-600" />
                <h2 className="font-bold text-ink">ตารางการแจกแจงความถี่คะแนน (ภาพรวม)</h2>
              </div>
              <p className="text-xs text-secondary mb-4">จำนวนผู้ตอบจำแนกตามคะแนน 1–5 (เปอร์เซ็นต์ของด้าน) ต่อด้านการประเมิน</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface text-left text-xs text-secondary">
                      <th className="px-3 py-2 font-semibold border border-border">ด้านการประเมิน</th>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <th key={s} className="px-3 py-2 font-semibold border border-border min-w-[80px] text-center">คะแนน {s}</th>
                      ))}
                      <th className="px-3 py-2 font-semibold border border-border text-center">รวม (N)</th>
                      <th className="px-3 py-2 font-semibold border border-border text-center">ค่าเฉลี่ย (x̄)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {freqOverall.map((f) => (
                      <tr key={f.key} className="hover:bg-surface/60">
                        <td className="px-3 py-2 border border-border text-ink font-medium">{f.label}</td>
                        {f.counts.map((cnt, i) => (
                          <td key={i} className="px-3 py-2 border border-border text-center">
                            <div className="font-bold text-ink">{cnt}</div>
                            <div className="text-[10px] text-muted">{f.total ? ((cnt / f.total) * 100).toFixed(1) : '0.0'}%</div>
                          </td>
                        ))}
                        <td className="px-3 py-2 border border-border text-center font-bold text-ink">{f.total}</td>
                        <td className="px-3 py-2 border border-border text-center font-bold text-amber-700">
                          {f.total ? f.mean.toFixed(2) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ตารางอัตราการตอบแบบประเมิน */}
            <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardCheck className="w-5 h-5 text-amber-600" />
                <h2 className="font-bold text-ink">ตารางอัตราการตอบแบบประเมินความพึงพอใจ</h2>
              </div>
              <p className="text-xs text-secondary mb-4">
                ฐานคำนวณ = นักเรียนที่ส่ง Post-test ของวิชานั้น (ตรงกับเงื่อนไขที่ระบบเปิดให้ทำแบบประเมิน)
              </p>
              {eligibleTotal === 0 ? (
                <p className="text-sm text-muted py-4">ยังไม่มีผู้ส่ง Post-test จึงยังคำนวณอัตราการตอบไม่ได้</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[640px]">
                    <thead>
                      <tr className="bg-surface text-left text-xs text-secondary">
                        <th className="px-3 py-2 font-semibold border border-border">รายวิชา</th>
                        <th className="px-3 py-2 font-semibold border border-border text-center min-w-[130px]">ผู้ทำ Post-test (ฐาน)</th>
                        <th className="px-3 py-2 font-semibold border border-border text-center min-w-[130px]">ผู้ตอบแบบประเมิน</th>
                        <th className="px-3 py-2 font-semibold border border-border text-center min-w-[110px]">อัตราการตอบ (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rateRows.map((r) => (
                        <tr key={r.courseId} className="hover:bg-surface/60">
                          <td className="px-3 py-2 border border-border text-ink font-medium">{r.title}</td>
                          <td className="px-3 py-2 border border-border text-center text-ink">{r.eligible}</td>
                          <td className="px-3 py-2 border border-border text-center text-ink">{r.responded}</td>
                          <td className="px-3 py-2 border border-border text-center font-bold text-amber-700">
                            {r.rate === null ? '-' : r.rate.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-surface">
                        <td className="px-3 py-2 border border-border font-bold text-ink">ภาพรวม</td>
                        <td className="px-3 py-2 border border-border text-center font-bold text-ink">{eligibleTotal}</td>
                        <td className="px-3 py-2 border border-border text-center font-bold text-ink">{responseCount}</td>
                        <td className="px-3 py-2 border border-border text-center font-bold text-amber-700">
                          {overallRate === null ? '-' : overallRate.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  )
}