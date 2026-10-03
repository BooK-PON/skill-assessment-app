'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { BookOpen, CheckCircle, Play, FileText, Lock, Award, ArrowLeft, UserPlus, BarChart3 } from 'lucide-react'
import Skeleton from '@/components/ui/Skeleton'
import { SKILL_DIMENSION_LABELS, computeSkillDims, SkillAttemptRow, SkillDim } from '@/lib/survey'
import SkillRadarChart from '@/components/charts/SkillRadarChart'
import ComparisonBarChart from '@/components/charts/ComparisonBarChart'

interface Lesson {
  id: string
  title: string
  order_index: number
}

export default function StudentCourseDetailPage() {
  const params = useParams()
  const courseId = params.courseId as string
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { toast } = useToast()

  const [courseTitle, setCourseTitle] = useState('')
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [hasPreTest, setHasPreTest] = useState(false)
  const [hasPostTest, setHasPostTest] = useState(false)
  const [hasSurvey, setHasSurvey] = useState(false)
  const [completedLessons, setCompletedLessons] = useState<string[]>([])
  const [enrollmentStatus, setEnrollmentStatus] = useState<string | null>(null)
  const [enrolling, setEnrolling] = useState(false)
  const [activeCount, setActiveCount] = useState(0)
  const [skillDims, setSkillDims] = useState<SkillDim[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCourseData() {
      setLoading(true)
      setError(null)
      let fetchErrorMessage: string | null = null
      const mergeError = (msg: string) => {
        if (msg) fetchErrorMessage = fetchErrorMessage ? `${fetchErrorMessage} / ${msg}` : msg
      }
      const { data: { user } } = await supabase.auth.getUser()

      // 1. ดึงข้อมูลวิชา
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('title, active_count')
        .eq('id', courseId)
        .single()
      if (courseError) {
        fetchErrorMessage = courseError.message
      } else if (course) {
        setCourseTitle(course.title)
        setActiveCount(course.active_count ?? 0)
      }

      // 2. ดึงรายการบทเรียน
      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select('id, title, order_index')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true })

      if (lessonError) {
        mergeError(lessonError.message)
      } else if (lessonData) {
        setLessons(lessonData)
      }

      // 3. เช็กสถานะการลงทะเบียนเรียน
      if (user) {
        const { data: enrollment, error: enrollError } = await supabase
          .from('enrollments')
          .select('status')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .single()

        if (enrollError) {
          mergeError(enrollError.message)
        } else if (enrollment) {
          setEnrollmentStatus(enrollment.status)
        }

        // 4. เช็กประวัติการทำแบบทดสอบของผู้เรียน
        const { data: scores, error: scoresError } = await supabase
          .from('assessment_scores')
          .select('assessment_type, lesson_id')
          .eq('user_id', user.id)
          .eq('course_id', courseId)

        if (scoresError) {
          mergeError(scoresError.message)
        } else if (scores) {
          setHasPreTest(scores.some((s) => s.assessment_type === 'pretest'))
          setHasPostTest(scores.some((s) => s.assessment_type === 'posttest'))
          
          const doneLessonIds = scores
            .filter((s) => s.assessment_type === 'lesson_quiz' && s.lesson_id)
            .map((s) => s.lesson_id as string)
          // กำจัดรายการซ้ำ (กรณีทำควิซซ้ำบท)
          const uniqueDoneIds = [...new Set(doneLessonIds)]
          setCompletedLessons(uniqueDoneIds)
        }

        // 5. เช็คว่าเคยตอบแบบประเมินความพึงพอใจแล้วหรือยัง
        const { data: surveyRow, error: surveyError } = await supabase
          .from('satisfaction_surveys')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .limit(1)
        if (surveyError) {
          mergeError(surveyError.message)
        } else {
          setHasSurvey(surveyRow !== null && surveyRow.length > 0)
        }

        // 6. ดึงผลการตอบรายข้อ เพื่อคำนวณทักษะ 5 ด้านของรายวิชานี้ (ประเมินเฉพาะคอร์สนี้ ไม่รวมทุกคอร์ส)
        const { data: attempts, error: attemptsError } = await supabase
          .from('assessment_attempts')
          .select('assessment_type, skill_dimension, is_correct')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
        if (attemptsError) {
          mergeError(attemptsError.message)
        } else if (attempts && attempts.length > 0) {
          setSkillDims(computeSkillDims(attempts as SkillAttemptRow[]))
        }
      }

      if (fetchErrorMessage) setError(fetchErrorMessage)
      setLoading(false)
    }

    if (courseId) fetchCourseData()
  }, [courseId])

  const isEnrolled = enrollmentStatus === 'active' || enrollmentStatus === 'completed'
  const isFull = activeCount >= 5
  const isAllLessonsCompleted = lessons.length === 0 || lessons.every(l => completedLessons.includes(l.id))

  // เมื่อเรียนครบทุกบทและทำ Post-test แล้ว ให้อัปเดตสถานะการลงทะเบียนเป็น "completed"
  useEffect(() => {
    async function markCompleted() {
      if (
        isEnrolled &&
        enrollmentStatus === 'active' &&
        isAllLessonsCompleted &&
        hasPostTest &&
        courseId
      ) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from('enrollments')
            .update({ status: 'completed' })
            .eq('user_id', user.id)
            .eq('course_id', courseId)
          setEnrollmentStatus('completed')
        }
      }
    }
    markCompleted()
  }, [isEnrolled, enrollmentStatus, isAllLessonsCompleted, hasPostTest, courseId])

  // ฟังก์ชันลงทะเบียนเรียนคอร์สนี้
  const handleEnroll = async () => {
    setEnrolling(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast('กรุณาเข้าสู่ระบบก่อนลงทะเบียน', 'info')
      setEnrolling(false)
      return
    }

    if (isFull) {
      toast('คอร์สนี้เต็มแล้ว (รองรับผู้เรียนสูงสุด 5 คน)', 'warning')
      setEnrolling(false)
      return
    }

    const { error } = await supabase.from('enrollments').upsert(
      {
        user_id: user.id,
        course_id: courseId,
        status: 'active',
        enrolled_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,course_id' }
    )

    if (error) {
      toast('เกิดข้อผิดพลาดในการลงทะเบียน: ' + error.message, 'error')
    } else {
      setEnrollmentStatus('active')
      // อัปเดตจำนวนผู้เรียนทันที (trigger refresh_course_active_count จะเพิ่มยอดให้)
      const { data: updatedCourse } = await supabase
        .from('courses')
        .select('active_count')
        .eq('id', courseId)
        .single()
      if (updatedCourse) setActiveCount(updatedCourse.active_count ?? 0)
    }
    setEnrolling(false)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-28 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      </div>
    )
  }

  // ยังไม่ได้ลงทะเบียนเรียน ต้องสมัครก่อนถึงจะเข้าสู่เนื้อหาได้
  if (!isEnrolled) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto mt-16 bg-white border border-border rounded-2xl p-10 text-center space-y-6">
          {error && (
            <div role="alert" className="bg-red-500/10 border border-red-500/20 text-red-600 p-4 rounded-xl text-sm text-left">
              เกิดข้อผิดพลาดในการโหลดข้อมูล: {error}
            </div>
          )}
          <div className="p-4 bg-blue-500/10 text-blue-600 rounded-2xl w-fit mx-auto">
            <BookOpen className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-ink">{courseTitle || 'รายวิชา'}</h1>
          <p className="text-secondary text-sm">
            กรุณาลงทะเบียนเรียนในรายวิชานี้ก่อน จึงจะสามารถเข้าเรียนและทำแบบทดสอบได้
          </p>
          <div className={`text-xs font-medium ${isFull ? 'text-rose-600' : 'text-secondary'}`}>
            {isFull ? 'คอร์สนี้เต็มแล้ว (รองรับได้ 5 คน)' : `ที่นั่งว่าง ${5 - activeCount} จาก 5`}
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleEnroll}
              disabled={enrolling || isFull}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-ink text-sm font-semibold px-6 py-3 rounded-xl transition disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              {enrolling ? 'กำลังลงทะเบียน...' : isFull ? 'เต็มแล้ว' : 'ลงทะเบียนเรียน'}
            </button>
            <button
              onClick={() => router.push('/dashboard/student/courses')}
              className="inline-flex items-center gap-2 bg-surface hover:bg-surface border border-border text-ink text-sm font-medium px-5 py-3 rounded-xl transition"
            >
              <ArrowLeft className="w-4 h-4" /> กลับ
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
<div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="border-b border-border pb-4">
          <button
            onClick={() => router.push('/dashboard/student/courses')}
            className="text-secondary hover:text-ink flex items-center gap-1 text-xs transition mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> รายวิชาทั้งหมด
          </button>
          <h1 className="text-2xl font-bold text-ink">{courseTitle}</h1>
          <p className="text-secondary text-xs mt-1">ทำแบบทดสอบก่อนเรียน เข้าศึกษาบทเรียน และทำแบบทดสอบหลังเรียน</p>
        </div>

        {error && (
          <div role="alert" className="bg-red-500/10 border border-red-500/20 text-red-600 p-4 rounded-xl text-sm">
            เกิดข้อผิดพลาดในการโหลดข้อมูล: {error}
          </div>
        )}

        {/* STEP 1: Pre-test */}
        <div className={`p-5 rounded-2xl border transition ${
          hasPreTest ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white border-border'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${hasPreTest ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600'}`}>
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-ink text-sm">1. แบบทดสอบก่อนเรียน (Pre-test)</h3>
                <p className="text-xs text-secondary">ทดสอบความรู้พื้นฐาน 20 ข้อก่อนเริ่มเข้าสู่บทเรียน</p>
              </div>
            </div>

            {hasPreTest ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                <CheckCircle className="w-4 h-4" /> ทำแล้ว
              </span>
            ) : (
              <button
                onClick={() => router.push(`/dashboard/student/courses/${courseId}/assessment?type=pre`)}
                className="bg-primary hover:bg-primary-dark text-ink text-xs font-semibold px-4 py-2 rounded-xl transition"
              >
                เริ่มทำ Pre-test
              </button>
            )}
          </div>
        </div>

        {/* STEP 2: รายการบทเรียน 10 บท */}
        <div className="space-y-3">
          <h3 className="font-bold text-ink text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-600" /> 2. เนื้อหาบทเรียนประจำรายวิชา ({completedLessons.length}/{lessons.length})
          </h3>

          <div className="space-y-2">
            {lessons.map((lesson) => {
              const isDone = completedLessons.includes(lesson.id)
              return (
                <div
                  key={lesson.id}
                  onClick={() => router.push(`/dashboard/student/courses/${courseId}/lessons/${lesson.id}`)}
                  className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    isDone
                      ? 'bg-white border-border hover:border-border'
                      : 'bg-white border-border hover:border-purple-500/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-purple-600 w-12">บทที่ {lesson.order_index}</span>
                    <span className="text-sm font-medium text-ink">{lesson.title}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isDone ? (
                      <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> เรียนแล้ว
                      </span>
                    ) : (
                      <span className="text-xs text-secondary flex items-center gap-1 group-hover:text-ink">
                        <Play className="w-3.5 h-3.5" /> เข้าเรียน
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* STEP 3: Post-test */}
        <div className={`p-5 rounded-2xl border transition ${
          hasPostTest ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white border-border'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${hasPostTest ? 'bg-emerald-500/10 text-emerald-600' : 'bg-purple-500/10 text-purple-600'}`}>
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-ink text-sm">3. แบบทดสอบหลังเรียน (Post-test)</h3>
                <p className="text-xs text-secondary">วัดผลสัมฤทธิ์ทางการเรียน 20 ข้อ หลังศึกษาครบทุกบทเรียน</p>
              </div>
            </div>

            {hasPostTest ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                <CheckCircle className="w-4 h-4" /> ทำแล้ว
              </span>
            ) : isAllLessonsCompleted ? (
              <button
                onClick={() => router.push(`/dashboard/student/courses/${courseId}/assessment?type=post`)}
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
              >
                เริ่มทำ Post-test
              </button>
            ) : (
              <span className="flex items-center gap-1 text-xs text-secondary bg-surface px-3 py-1.5 rounded-lg border border-border">
                <Lock className="w-3.5 h-3.5" /> เรียนให้ครบก่อน
              </span>
            )}
          </div>
          {hasPostTest && !hasSurvey && (
            <button
              onClick={() => router.push(`/dashboard/student/courses/${courseId}/satisfaction`)}
              className="mt-3 inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-ink text-xs font-semibold px-4 py-2 rounded-xl transition"
            >
              <Award className="w-4 h-4" /> ทำแบบประเมินความพึงพอใจ (5 ข้อ)
            </button>
          )}
        </div>

        {/* STEP 4: ทักษะ 5 ด้านของรายวิชานี้ (ประเมินรายคอร์ส) */}
        <div className="bg-white border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-ink text-sm">4. ทักษะ 5 ด้านของรายวิชานี้ (Pre-test vs Post-test)</h3>
          </div>
          <p className="text-xs text-secondary mb-5">
            การประเมินความสามารถอ้างอิงจากผลการทดสอบในรายวิชานี้เท่านั้น ไม่นำคะแนนจากวิชาอื่นมารวม · สีม่วง = ก่อนเรียน (Pre-test) · สีเขียว = หลังเรียน (Post-test)
          </p>

          {!hasPreTest && !hasPostTest ? (
            <p className="text-sm text-secondary text-center py-8">
              ยังไม่มีผลการทดสอบในรายวิชานี้ เริ่มจากทำแบบทดสอบก่อนเรียน (Pre-test) เพื่อดูกราฟทักษะ 5 ด้านของคุณ
            </p>
          ) : (
            <>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-surface border border-border rounded-xl p-4">
                  <p className="text-xs font-bold text-ink mb-3">กราฟเรดาร์ (Radar Chart)</p>
                  <SkillRadarChart data={skillDims} />
                </div>
                <div className="bg-surface border border-border rounded-xl p-4">
                  <p className="text-xs font-bold text-ink mb-3">กราฟแท่งเปรียบเทียบ (Bar Chart)</p>
                  <ComparisonBarChart data={skillDims} />
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
                {skillDims.map((d) => (
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
            </>
          )}
        </div>

      </div>
    </div>
  )
}