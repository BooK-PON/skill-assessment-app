'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { CheckCircle2, ArrowRight, ShieldAlert, Smile } from 'lucide-react'
import Skeleton from '@/components/ui/Skeleton'

interface Question {
  id: string
  question_text: string
  options: string[]
  correct_answer: number
  skill_dimension?: string
}

// อัลกอริทึม Fisher-Yates Shuffle สำหรับสุ่มข้อสอบ 20 ข้อ
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function safeParseOptions(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function StudentAssessmentPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const courseId = params.courseId as string
  const type = (searchParams.get('type') as 'pre' | 'post') || 'pre'
  
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { toast } = useToast()

  const [questions, setQuestions] = useState<Question[]>([])
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [score, setScore] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [courseTitle, setCourseTitle] = useState('')

  useEffect(() => {
    async function fetchAndRandomizeQuestions() {
      setLoading(true)
      setError(null)
      // ชื่อวิชา (ใช้แสดงผลและบันทึก activity log)
      const { data: courseData } = await supabase
        .from('courses')
        .select('title')
        .eq('id', courseId)
        .maybeSingle()
      if (courseData) setCourseTitle(courseData.title)

      // ดึงข้อสอบทั้งหมดในรายวิชา
      const { data: qData, error: qError } = await supabase
        .from('questions')
        .select('*')
        .eq('course_id', courseId)

      if (qError) {
        setError(qError.message)
      } else if (qData && qData.length > 0) {
        const formatted = qData.map((q) => ({
          ...q,
          options: typeof q.options === 'string' ? safeParseOptions(q.options) : q.options,
        }))
        // สุ่มข้อสอบ 20 ข้อจากคลังรวม
        const randomized = shuffleArray(formatted).slice(0, 20)
        setQuestions(randomized)
      }
      setLoading(false)
    }

    if (courseId) fetchAndRandomizeQuestions()
  }, [courseId])

  const handleSubmit = async () => {
    if (submitted || submitting) return

    if (Object.keys(userAnswers).length < questions.length) {
      toast(`กรุณาตอบคำถามให้ครบทั้ง ${questions.length} ข้อ`, 'warning')
      return
    }

    setSubmitting(true)

    let calculatedScore = 0
    questions.forEach((q, idx) => {
      if (userAnswers[idx] === Number(q.correct_answer)) {
        calculatedScore += 1
      }
    })

    setScore(calculatedScore)

    // บันทึกคะแนน Pre-test หรือ Post-test ลง Supabase
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (user) {
        const percentage = Number(((calculatedScore / questions.length) * 100).toFixed(2))
        // ลบผลเดิมของชุดนี้ก่อน (กันซ้ำ) แล้ว insert ผลใหม่
        const { error: deleteError } = await supabase
          .from('assessment_scores')
          .delete()
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .eq('assessment_type', type === 'pre' ? 'pretest' : 'posttest')
        if (deleteError) throw deleteError

        const { data: inserted, error } = await supabase.from('assessment_scores').insert([
          {
            user_id: user.id,
            course_id: courseId,
            score: calculatedScore,
            total_questions: questions.length,
            percentage,
            assessment_type: type === 'pre' ? 'pretest' : 'posttest',
          },
        ]).select('id').single()
        if (error) throw error

        // บันทึกผลรายข้อ (assessment_attempts) เพื่อใช้คำนวณกราฟทักษะรายด้าน
        if (inserted) {
          const attempts = questions.map((q, idx) => ({
            score_id: inserted.id,
            user_id: user.id,
            course_id: courseId,
            question_id: q.id,
            assessment_type: type === 'pre' ? 'pretest' : 'posttest',
            skill_dimension: q.skill_dimension || 'knowledge',
            answer_index: userAnswers[idx] ?? null,
            is_correct: userAnswers[idx] === Number(q.correct_answer),
          }))
          const { error: attemptsError } = await supabase
            .from('assessment_attempts')
            .insert(attempts)
          if (attemptsError) throw attemptsError
        }

        // บันทึก activity log (หลักฐานการส่งข้อสอบของนักเรียน) — ล้มเหลวไม่กระทบการบันทึกคะแนน
        const typeLabel = type === 'pre' ? 'Pre-test' : 'Post-test'
        await supabase.from('activity_logs').insert([
          {
            user_id: user.id,
            action: type === 'pre' ? 'submit_pretest' : 'submit_posttest',
            target_type: 'assessment',
            detail: `ส่ง${typeLabel} วิชา "${courseTitle || courseId}" ได้ ${calculatedScore}/${questions.length} คะแนน (${percentage}%)`,
          },
        ]).then(() => {})
      }
    } catch (err: any) {
      toast('เกิดข้อผิดพลาดในการบันทึกคะแนน: ' + (err.message || 'กรุณาลองใหม่'), 'error')
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    setSubmitted(true)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
          <div className="space-y-6">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-12 w-32 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-rose-600" />
        <div role="alert" className="bg-red-500/10 border border-red-500/20 text-red-600 p-4 rounded-xl text-sm max-w-md text-center">
          เกิดข้อผิดพลาดในการโหลดข้อสอบ: {error}
        </div>
        <button onClick={() => router.back()} className="text-sm bg-white border border-border px-4 py-2 rounded-lg text-ink">
          ย้อนกลับ
        </button>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-amber-600" />
        <p className="text-ink">คลังข้อสอบในรายวิชานี้ยังไม่เพียงพอสำหรับการทดสอบ</p>
        <button onClick={() => router.back()} className="text-sm bg-white border border-border px-4 py-2 rounded-lg text-ink">
          ย้อนกลับ
        </button>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {!submitted ? (
          <>
            <div className="border-b border-border pb-4">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-2 ${
                type === 'pre' ? 'bg-blue-500/10 text-blue-600' : 'bg-purple-500/10 text-purple-600'
              }`}>
                {type === 'pre' ? 'แบบทดสอบก่อนเรียน (Pre-test)' : 'แบบทดสอบหลังเรียน (Post-test)'}
              </span>
              <h1 className="text-2xl font-bold text-ink">แบบทดสอบวัดผลสัมฤทธิ์ ({questions.length} ข้อ)</h1>
            </div>

            <div className="space-y-6">
              {questions.map((q, idx) => (
                <div key={q.id} className="bg-white border border-border rounded-xl p-5 space-y-3">
                  <p className="font-semibold text-ink text-sm">
                    <span className="text-purple-600 font-bold mr-2">ข้อที่ {idx + 1}.</span> {q.question_text}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => (
                      <label
                        key={optIdx}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition text-xs ${
                          userAnswers[idx] === optIdx
                            ? 'bg-purple-500/10 border-purple-500 text-purple-600 font-medium'
                            : 'bg-surface border-border text-ink hover:bg-surface'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${idx}`}
                          checked={userAnswers[idx] === optIdx}
                          onChange={() => setUserAnswers({ ...userAnswers, [idx]: optIdx })}
                          className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-8 py-3 rounded-xl transition shadow-sm disabled:opacity-50"
              >
                {submitting ? 'กำลังส่งแบบทดสอบ...' : 'ส่งแบบทดสอบ'}
              </button>
            </div>
          </>
        ) : (
          <div className="bg-white border border-border rounded-2xl p-8 text-center space-y-6">
            <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto" />
            <h2 className="text-2xl font-bold text-ink">ส่งแบบทดสอบเรียบร้อยแล้ว</h2>
            <div className="inline-block bg-surface border border-border px-8 py-4 rounded-xl">
              <span className="text-4xl font-extrabold text-emerald-600">{score}</span>
              <span className="text-secondary text-lg"> / {questions.length} คะแนน</span>
            </div>

            {/* ส่วนที่เพิ่มใหม่: ลิงก์แบบประเมินความพึงพอใจ (ในเว็บ) เฉพาะเมื่อ Post-test เสร็จ */}
            {type === 'post' && (
              <div className="mt-8 pt-6 border-t border-border space-y-4 text-left">
                <div>
                  <h3 className="text-lg font-bold text-ink">ขั้นตอนสุดท้าย: แบบประเมินความพึงพอใจการใช้งานระบบ</h3>
                  <p className="text-xs text-secondary">กรุณาตอบแบบประเมินเพื่อเสร็จสิ้นการเรียนในรายวิชานี้</p>
                </div>
                <button
                  onClick={() => router.push(`/dashboard/student/courses/${courseId}/satisfaction`)}
                  className="inline-flex items-center justify-center gap-2 w-full bg-amber-500 hover:bg-amber-400 text-ink font-bold text-sm px-6 py-3 rounded-xl transition"
                >
                  <Smile className="w-5 h-5" /> ทำแบบประเมินความพึงพอใจ (5 ข้อ)
                </button>
              </div>
            )}

            <div className="pt-4">
              <button
                onClick={() => router.push(`/dashboard/student/courses/${courseId}`)}
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-ink font-medium px-6 py-2.5 rounded-xl transition"
              >
                กลับสู่หน้ารายวิชา <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}