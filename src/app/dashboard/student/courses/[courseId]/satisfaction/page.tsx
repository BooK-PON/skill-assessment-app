'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { SURVEY_DIMENSIONS } from '@/lib/survey'
import { ArrowLeft, CheckCircle2, Smile } from 'lucide-react'
import Skeleton from '@/components/ui/Skeleton'

export default function StudentSatisfactionPage() {
  const { toast } = useToast()
  const params = useParams()
  const courseId = params.courseId as string
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [courseTitle, setCourseTitle] = useState('')
  const [scores, setScores] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setError(null)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) {
        setError('ไม่สามารถตรวจสอบผู้ใช้งาน: ' + userError.message)
        setLoading(false)
        return
      }
      if (!user) {
        setLoading(false)
        return
      }

      const [{ data: course, error: courseError }, { data: rows, error: rowsError }] = await Promise.all([
        supabase.from('courses').select('title').eq('id', courseId).maybeSingle(),
        supabase
          .from('satisfaction_surveys')
          .select('dimension, score')
          .eq('user_id', user.id)
          .eq('course_id', courseId),
      ])

      if (courseError) {
        setError('ไม่สามารถโหลดรายวิชา: ' + courseError.message)
      } else if (course) {
        setCourseTitle(course.title)
      }
      if (rowsError) {
        setError('ไม่สามารถโหลดผลแบบประเมินเดิม: ' + rowsError.message)
      } else if (rows && rows.length > 0) {
        const map: Record<string, number> = {}
        rows.forEach((r) => {
          map[r.dimension] = r.score
        })
        setScores(map)
        setSaved(true)
      }
      setLoading(false)
    }
    load()
  }, [courseId])

  const allSelected = SURVEY_DIMENSIONS.every((d) => (scores[d.key] ?? 0) > 0)

  const handleSubmit = async () => {
    if (!allSelected) {
      toast('กรุณาให้คะแนนครบทั้ง 5 ด้านก่อนส่ง', 'warning')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) throw new Error('กรุณาเข้าสู่ระบบใหม่')

      const rows = SURVEY_DIMENSIONS.map((d) => ({
        user_id: user.id,
        course_id: courseId,
        dimension: d.key,
        score: scores[d.key],
      }))

      const { error } = await supabase
        .from('satisfaction_surveys')
        .upsert(rows, { onConflict: 'user_id,course_id,dimension' })
      if (error) throw error

      // บันทึก activity log (หลักฐานการส่งแบบประเมินของนักเรียน) — ล้มเหลวไม่กระทบผลการประเมิน
      await supabase.from('activity_logs').insert([
        {
          user_id: user.id,
          action: 'submit_satisfaction',
          target_type: 'survey',
          detail: `ส่งแบบประเมินความพึงพอใจ 5 ด้าน วิชา "${courseTitle || courseId}"`,
        },
      ]).then(() => {})
      setSaved(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/dashboard/student/courses/${courseId}`)}
              className="p-2 bg-white hover:bg-surface border border-border rounded-lg transition"
              aria-label="กลับสู่หน้ารายวิชา"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-1 bg-amber-500/10 text-amber-600">
                แบบประเมินความพึงพอใจ
              </span>
              <h1 className="text-xl font-bold text-ink">{courseTitle}</h1>
            </div>
          </div>
        </div>

        {saved ? (
          <div className="bg-white border border-border rounded-2xl p-10 text-center space-y-5">
            <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto" />
            <h2 className="text-2xl font-bold text-ink">บันทึกแบบประเมินเรียบร้อยแล้ว</h2>
            <p className="text-secondary text-sm">
              ขอบคุณสำหรับความคิดเห็น คะแนนของท่านจะช่วยให้เราพัฒนาระบบและเนื้อหาการเรียนให้ดียิ่งขึ้น
            </p>
            <div className="pt-2">
              <button
                onClick={() => router.push(`/dashboard/student/courses/${courseId}`)}
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-ink font-medium px-6 py-2.5 rounded-xl transition"
              >
                กลับสู่หน้ารายวิชา
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white border border-border rounded-xl p-5 flex items-start gap-3">
              <Smile className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-ink">
                กรุณาให้คะแนนความพึงพอใจในแต่ละด้าน (1 = น้อยที่สุด ถึง 5 = มากที่สุด) เมื่อครบทุกด้านแล้วกดปุ่มส่ง
              </p>
            </div>

            {error && (
              <div role="alert" className="bg-rose-500/10 border border-rose-500/30 text-rose-600 text-sm rounded-xl p-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {SURVEY_DIMENSIONS.map((d, i) => (
                <div key={d.key} className="bg-white border border-border rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-ink text-sm">
                      <span className="text-amber-600 font-bold mr-2">ด้านที่ {i + 1}.</span>
                      {d.label}
                    </p>
                    <span className="text-xs text-amber-600 font-bold">
                      {scores[d.key] ? `${scores[d.key]}/5` : 'ยังไม่ได้ให้คะแนน'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <label
                        key={n}
                        className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border cursor-pointer transition text-xs ${
                          scores[d.key] === n
                            ? 'bg-primary-light border-primary text-ink font-bold'
                            : 'bg-surface border-border text-secondary hover:bg-surface'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`survey-${d.key}`}
                          value={n}
                          checked={scores[d.key] === n}
                          onChange={() => setScores({ ...scores, [d.key]: n })}
                          className="sr-only"
                        />
                        <span className="text-sm font-bold">{n}</span>
                        <span>{n === 1 ? 'น้อยที่สุด' : n === 5 ? 'มากที่สุด' : ''}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={handleSubmit}
                disabled={submitting || !allSelected}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-ink font-bold px-8 py-3 rounded-xl transition"
              >
                {submitting ? 'กำลังบันทึก...' : 'ส่งแบบประเมิน'}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}