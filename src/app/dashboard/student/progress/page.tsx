'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SKILL_DIMENSION_LABELS, computeSkillDims, SkillAttemptRow, SkillDim } from '@/lib/survey'
import { TrendingUp, RefreshCw, Compass, BookOpen, Sparkles } from 'lucide-react'
import Link from 'next/link'
import Skeleton from '@/components/ui/Skeleton'
import SkillRadarChart from '@/components/charts/SkillRadarChart'
import ComparisonBarChart from '@/components/charts/ComparisonBarChart'

interface CourseRow {
  course_id: string
  status: string
  courses?: { title: string }[] | { title: string } | null
}

function courseTitleOf(c: CourseRow['courses']): string {
  if (!c) return ''
  return Array.isArray(c) ? c[0]?.title || '' : c.title
}

interface Recommendation {
  course_id: string
  title: string
  share: number
  total: number
}

export default function StudentProgressPage() {
  const supabase = useMemo(() => createClient(), [])
  const [courses, setCourses] = useState<CourseRow[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [courseParam, setCourseParam] = useState<string | null>(null)
  const [dims, setDims] = useState<SkillDim[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [hasPosttest, setHasPosttest] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadRecommendations = useCallback(async (weakKey: string | null) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: allQuestions, error: qsError } = await supabase
      .from('questions')
      .select('course_id, skill_dimension')
    if (qsError) {
      setError('เกิดข้อผิดพลาดในการโหลดคลังข้อสอบ: ' + qsError.message)
      return
    }

    const { data: allCourses, error: cError } = await supabase.from('courses').select('id, title, status')
    if (cError) {
      setError('เกิดข้อผิดพลาดในการโหลดรายวิชา: ' + cError.message)
      return
    }

    if (!allQuestions || !allCourses) return

    const { data: enrollments, error: eError } = await supabase
      .from('enrollments')
      .select('course_id')
      .eq('user_id', user.id)
    if (eError) {
      setError('เกิดข้อผิดพลาดในการโหลดการลงทะเบียน: ' + eError.message)
      return
    }
    const enrolledSet = new Set((enrollments || []).map((e) => e.course_id))

    const byCourse = new Map<string, { total: number; weak: number }>()
    allQuestions.forEach((q) => {
      const stat = byCourse.get(q.course_id) || { total: 0, weak: 0 }
      stat.total += 1
      if (q.skill_dimension === weakKey) stat.weak += 1
      byCourse.set(q.course_id, stat)
    })

    const next: Recommendation[] = []
    allCourses.forEach((c) => {
      if (c.status !== 'published') return
      if (enrolledSet.has(c.id)) return
      const stat = byCourse.get(c.id)
      if (!stat || stat.total === 0) return
      next.push({
        course_id: c.id,
        title: c.title,
        share: weakKey ? Math.round((stat.weak / stat.total) * 100) : 0,
        total: stat.total,
      })
    })
    next.sort((a, b) => b.share - a.share || b.total - a.total)
    setRecommendations(next.slice(0, 3))
  }, [])

  const fetchAll = useCallback(async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) {
      setError('เกิดข้อผิดพลาดในการตรวจสอบผู้ใช้: ' + userError.message)
      setLoading(false)
      return
    }
    if (!user) {
      setLoading(false)
      return
    }

    const { data: enrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select('course_id, status, enrolled_at, courses (title)')
      .eq('user_id', user.id)
      .order('enrolled_at', { ascending: false })

    if (enrollError) {
      setError('เกิดข้อผิดพลาดในการโหลดการลงทะเบียน: ' + enrollError.message)
    }
    const list = (enrollments || []) as CourseRow[]
    setCourses(list)
    const target = selected || courseParam || list[0]?.course_id || null
    setSelected(target)

    let weakKey: string | null = null

    if (target) {
      const { data: attempts, error: attemptsError } = await supabase
        .from('assessment_attempts')
        .select('assessment_type, skill_dimension, is_correct')
        .eq('user_id', user.id)
        .eq('course_id', target)
      if (attemptsError) {
        setError('เกิดข้อผิดพลาดในการโหลดผลการทดสอบ: ' + attemptsError.message)
      }

      const rows = (attempts || []) as SkillAttemptRow[]

      const { data: postScore, error: postError } = await supabase
        .from('assessment_scores')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', target)
        .eq('assessment_type', 'posttest')
        .limit(1)
      if (postError) {
        setError('เกิดข้อผิดพลาดในการโหลดผล Post-test: ' + postError.message)
      }
      setHasPosttest(postScore !== null && postScore.length > 0)

      const chart = computeSkillDims(rows)
      setDims(chart)

      const smallest = chart
        .map((d) => ({
          key: d.key,
          val: d.pre ?? d.post,
        }))
        .filter((x) => x.val !== null)
        .sort((a, b) => (a.val ?? 0) - (b.val ?? 0))
      weakKey = smallest.length > 0 ? smallest[0].key : null
    } else {
      setDims([])
      setHasPosttest(false)
    }

    setUpdatedAt(new Date().toLocaleString('th-TH'))
    await loadRecommendations(weakKey)
    setLoading(false)
  }, [selected, courseParam])

  useEffect(() => {
    // อ่าน ?course= จาก URL ครั้งเดียว (เลี่ยงใช้SearchParams กัน prerender error)
    const t = setTimeout(() => {
      if (typeof window !== 'undefined') {
        setCourseParam(new URLSearchParams(window.location.search).get('course'))
      }
    }, 0)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { void fetchAll() }, 0)
    return () => clearTimeout(t)
  }, [fetchAll])

  const handleSelect = (id: string) => {
    setSelected(id)
  }

  const selectedTitle = courseTitleOf(courses.find((c) => c.course_id === selected)?.courses)

  const weakest = dims
    .map((d) => ({ key: d.key, label: d.label, val: d.pre ?? d.post }))
    .filter((x) => x.val !== null)
    .sort((a, b) => (a.val ?? 0) - (b.val ?? 0))[0]

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold mb-2">
              <TrendingUp className="w-3.5 h-3.5" /> ความก้าวหน้าของฉัน
            </span>
            <h1 className="text-2xl font-bold text-ink">กราฟทักษะ 5 ด้าน</h1>
            <p className="text-sm text-secondary mt-1">เปรียบเทียบผล Pre-test กับ Post-test แบบเรียลไทม์ (อัปเดต {updatedAt || '-'})</p>
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
          <div role="alert" className="bg-red-500/10 border border-red-500/20 text-red-600 p-4 rounded-xl text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-8 space-y-6">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-20 bg-white border border-border rounded-xl space-y-4">
            <BookOpen className="w-12 h-12 text-muted mx-auto" />
            <p className="text-secondary text-sm">ยังไม่มีการลงทะเบียนเรียนในรายวิชาใด</p>
            <Link
              href="/dashboard/student/courses/browse"
              className="inline-block bg-primary hover:bg-primary-dark text-ink text-sm font-medium px-5 py-2.5 rounded-lg transition"
            >
              ไปเลือกคอร์สเรียน
            </Link>
          </div>
        ) : (
          <>
            {/* เลือกคอร์ส */}
            {courses.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {courses.map((c) => (
                  <button
                    key={c.course_id}
                    onClick={() => handleSelect(c.course_id)}
                    className={`text-sm px-4 py-2 rounded-lg border transition font-medium ${
                      selected === c.course_id
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600'
                        : 'bg-white border-border text-ink hover:bg-surface'
                    }`}
                  >
                    {courseTitleOf(c.courses) || 'ไม่ทราบชื่อวิชา'}
                  </button>
                ))}
              </div>
            )}

            {/* กราฟทักษะ */}
            <div className="bg-white border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <h2 className="font-bold text-ink">{selectedTitle || 'รายวิชาที่เลือก'}</h2>
              </div>
              <p className="text-xs text-secondary mb-5">
                กราฟแสดงร้อยละความถูกต้องรายทักษะ · สีม่วง = ก่อนเรียน (Pre-test) · สีเขียว = หลังเรียน (Post-test)
              </p>

              {dims.every((d) => d.pre === null && d.post === null) ? (
                <p className="text-sm text-secondary text-center py-8">
                  ยังไม่มีผลการทดสอบของวิชานี้ กรุณาเข้าเรียนและทำ Pre-test / Post-test ก่อน
                </p>
              ) : (
                <>
                  <div className="grid lg:grid-cols-2 gap-6">
                    <div className="bg-surface border border-border rounded-xl p-4">
                      <p className="text-xs font-bold text-ink mb-3">กราฟเรดาร์ (Radar Chart)</p>
                      <SkillRadarChart data={dims} />
                    </div>
                    <div className="bg-surface border border-border rounded-xl p-4">
                      <p className="text-xs font-bold text-ink mb-3">กราฟแท่งเปรียบเทียบ (Bar Chart)</p>
                      <ComparisonBarChart data={dims} />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
                    {dims.map((d) => (
                      <div key={d.key} className="bg-surface border border-border rounded-xl p-3">
                        <p className="text-[11px] text-ink font-medium mb-1">{d.label}</p>
                        <p className="text-[10px] text-secondary mb-2">
                          {SKILL_DIMENSION_LABELS[d.key]}
                          <span className="text-muted"> · {d.preCount + d.postCount} ข้อ</span>
                        </p>
                        <div className="flex gap-3 text-[10px]">
                          <span className="text-purple-600 font-bold">Pre {d.pre !== null ? `${d.pre}%` : '-'}</span>
                          <span className="text-emerald-600 font-bold">Post {d.post !== null ? `${d.post}%` : '-'}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {hasPosttest && selected && (
                    <Link
                      href={`/dashboard/student/courses/${selected}/satisfaction`}
                      className="mt-2 inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-ink text-sm font-semibold px-5 py-2.5 rounded-xl transition"
                    >
                      <Sparkles className="w-4 h-4" /> ทำแบบประเมินความพึงพอใจ (5 ข้อ)
                    </Link>
                  )}
                </>
              )}
            </div>

            {/* แนะนำคอร์ส */}
            <div className="bg-white border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <Compass className="w-5 h-5 text-amber-600" />
                <h2 className="font-bold text-ink">คอร์สเรียนที่แนะนำ</h2>
              </div>
              <p className="text-xs text-secondary mb-5">
                {weakest
                  ? `อิงจากทักษะที่ยังเป็นจุดอ่อนของคุณ (${weakest.label} ${weakest.val}%) → คอร์สที่เน้นทักษะนี้มากที่สุด`
                  : 'เมื่อทำแบบทดสอบแล้ว ระบบจะแนะนำคอร์สที่ช่วยเสริมจุดอ่อนของคุณ'}
              </p>

              {recommendations.length === 0 ? (
                <p className="text-sm text-secondary text-center py-6">
                  {weakest ? 'ยังไม่มีคอร์สอื่นที่เปิดสอนในระบบ ตอนนี้' : 'ยังมีข้อมูลไม่พอสำหรับการแนะนำ'}
                </p>
              ) : (
                <div className="grid md:grid-cols-3 gap-4">
                  {recommendations.map((r, i) => (
                    <Link
                      key={r.course_id}
                      href={`/dashboard/student/courses/${r.course_id}`}
                      className="bg-surface border border-border hover:border-amber-500/40 rounded-xl p-5 transition group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl font-extrabold text-muted group-hover:text-amber-600/60">
                          {i + 1}
                        </span>
                        <span className="text-[11px] bg-amber-500/10 text-amber-600 px-2 py-1 rounded-full font-bold">
                          เน้น {weakest?.label ?? '-'} {r.share}%
                        </span>
                      </div>
                      <p className="font-semibold text-ink text-sm leading-snug line-clamp-2">{r.title}</p>
                      <p className="text-[11px] text-secondary mt-2">{r.total} ข้อสอบ</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  )
}