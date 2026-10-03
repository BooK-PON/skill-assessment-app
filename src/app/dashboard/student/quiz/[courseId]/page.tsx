'use client'

import { useEffect, useState, useMemo, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Award, Send, HelpCircle } from 'lucide-react'
import Skeleton from '@/components/ui/Skeleton'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'

interface Question {
  id: string
  question_text: string
  options: string[]
  correct_answer: number
  lesson_id: string | null
  skill_dimension?: string
}

interface Course {
  title: string
}

function safeParseOptions(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function QuizPage({ params }: { params: Promise<{ courseId: string }> }) {
  const resolvedParams = use(params)
  const courseId = resolvedParams.courseId

  const searchParams = useSearchParams()
  const testType = searchParams.get('type') === 'post' ? 'post' : 'pre'

  const [course, setCourse] = useState<Course | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ score: number; total: number; percentage: number } | null>(null)
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])
  const { toast } = useToast()

  useEffect(() => {
    async function loadQuizData() {
      setError(null)
      // 1. ดึงชื่อวิชา
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('title')
        .eq('id', courseId)
        .single()

      if (courseError) {
        setError(courseError.message)
      } else if (courseData) {
        setCourse(courseData)
      }

      // 2. ดึงข้อสอบทั้งหมดของวิชานี้
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('id, question_text, options, correct_answer, lesson_id, skill_dimension')
        .eq('course_id', courseId)

      if (questionsError) {
        setError(questionsError.message)
      } else if (questionsData && questionsData.length > 0) {
        const parsedQuestions = questionsData.map((q) => ({
          ...q,
          options:
            typeof q.options === 'string' ? safeParseOptions(q.options) : q.options,
        }))
        // Fisher-Yates Shuffle
        const shuffled = [...parsedQuestions]
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        const selected20 = shuffled.slice(0, 20)
        setQuestions(selected20)
      }

      setLoading(false)
    }

    loadQuizData()
  }, [courseId])

  const handleSelectOption = (qIndex: number, optionIndex: number) => {
    if (result) return
    setUserAnswers(prev => ({ ...prev, [qIndex]: optionIndex }))
  }

  const handleSubmitQuiz = () => {
    if (submitting || result) return

    if (Object.keys(userAnswers).length < questions.length) {
      setConfirmSubmitOpen(true)
      return
    }

    submitQuiz()
  }

  const submitQuiz = async () => {
    setSubmitting(true)

    // ตรวจคะแนน
    let score = 0
    questions.forEach((q, idx) => {
      if (userAnswers[idx] === Number(q.correct_answer)) {
        score++
      }
    })

    const total = questions.length
    const percentage = Number(((score / total) * 100).toFixed(2))

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (user) {
        // บันทึกลง Supabase พร้อมระบุ assessment_type ('pretest' หรือ 'posttest')
        // ลบผลเดิมของชุดนี้ก่อน (กันซ้ำ) แล้ว insert ผลใหม่
        const { error: deleteError } = await supabase
          .from('assessment_scores')
          .delete()
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .eq('assessment_type', testType === 'pre' ? 'pretest' : 'posttest')
        if (deleteError) throw deleteError

        const { data: inserted, error } = await supabase.from('assessment_scores').insert([
          {
            user_id: user.id,
            course_id: courseId,
            score,
            total_questions: total,
            percentage,
            assessment_type: testType === 'pre' ? 'pretest' : 'posttest'
          }
        ]).select('id').single()
        if (error) throw error

        // บันทึกผลรายข้อ (assessment_attempts) เพื่อใช้คำนวณกราฟทักษะรายด้าน
        if (inserted) {
          const attempts = questions.map((q, idx) => ({
            score_id: inserted.id,
            user_id: user.id,
            course_id: courseId,
            question_id: q.id,
            assessment_type: testType === 'pre' ? 'pretest' : 'posttest',
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
        const typeLabel = testType === 'pre' ? 'Pre-test' : 'Post-test'
        await supabase.from('activity_logs').insert([
          {
            user_id: user.id,
            action: testType === 'pre' ? 'submit_pretest' : 'submit_posttest',
            target_type: 'assessment',
            detail: `ส่ง${typeLabel} วิชา "${course?.title || courseId}" ได้ ${score}/${total} คะแนน (${percentage}%)`,
          },
        ]).then(() => {})
      }

      setResult({ score, total, percentage })
    } catch (err: any) {
      toast('เกิดข้อผิดพลาดในการบันทึกคะแนน: ' + (err.message || 'กรุณาลองใหม่'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-3xl mx-auto space-y-6">
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
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="bg-white border border-border rounded-xl p-8 text-center max-w-md space-y-4">
          <div role="alert" className="bg-red-500/10 border border-red-500/20 text-red-600 p-4 rounded-xl text-sm">
            เกิดข้อผิดพลาดในการโหลดข้อสอบ: {error}
          </div>
          <Link href={`/dashboard/student/courses/${courseId}`} className="inline-block bg-primary text-ink px-4 py-2 rounded-lg text-sm">
            กลับไปที่คอร์สเรียน
          </Link>
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="bg-white border border-border rounded-xl p-8 text-center max-w-md space-y-4">
          <p className="text-secondary">ยังไม่มีคลังข้อสอบในวิชานี้</p>
          <Link href={`/dashboard/student/courses/${courseId}`} className="inline-block bg-primary text-ink px-4 py-2 rounded-lg text-sm">
            กลับไปที่คอร์สเรียน
          </Link>
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
            <Link href={`/dashboard/student/courses/${courseId}`} className="p-2 bg-white hover:bg-surface border border-border rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                testType === 'pre' ? 'bg-purple-500/10 text-purple-600' : 'bg-emerald-500/10 text-emerald-600'
              }`}>
                {testType === 'pre' ? 'แบบทดสอบก่อนเรียน (Pre-test)' : 'แบบทดสอบหลังเรียน (Post-test)'}
              </span>
              <h1 className="text-xl font-bold mt-1">{course?.title}</h1>
            </div>
          </div>
          <span className="text-xs bg-white border border-border text-ink px-3 py-1 rounded-full flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" /> สุ่ม {questions.length} ข้อ
          </span>
        </div>

        {/* ผลคะแนนการสอบ */}
        {result ? (
          <div className="bg-white border border-border rounded-xl p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                สรุปผล {testType === 'pre' ? 'Pre-test' : 'Post-test'}
              </h2>
              <p className="text-secondary text-sm mt-1">บันทึกผลการประเมินเรียบร้อยแล้ว</p>
            </div>

            <div className="bg-surface p-6 rounded-xl grid grid-cols-2 gap-4 max-w-sm mx-auto border border-border">
              <div>
                <p className="text-secondary text-xs">คะแนนที่ได้</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">{result.score} / {result.total}</p>
              </div>
              <div>
                <p className="text-secondary text-xs">คิดเป็นร้อยละ</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{result.percentage}%</p>
              </div>
            </div>

            <div>
              <Link
                href={`/dashboard/student/courses/${courseId}`}
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-ink font-medium px-6 py-2.5 rounded-xl transition"
              >
                กลับไปที่บทเรียน
              </Link>
            </div>
          </div>
        ) : (
          /* รายการโจทย์ข้อสอบ */
          <div className="space-y-6">
            {questions.map((q, qIndex) => (
              <div key={q.id} className="bg-white border border-border rounded-xl p-6 space-y-4">
                <h3 className="font-semibold text-lg text-ink">
                  {qIndex + 1}. {q.question_text}
                </h3>

                <div className="grid gap-3">
                  {q.options.map((opt, oIndex) => {
                    const isSelected = userAnswers[qIndex] === oIndex
                    return (
                      <button
                        key={oIndex}
                        type="button"
                        onClick={() => handleSelectOption(qIndex, oIndex)}
                        className={`w-full text-left p-4 rounded-xl border text-sm transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-500/10 border-blue-500 text-ink font-medium'
                            : 'bg-surface border-border text-ink hover:bg-surface'
                        }`}
                      >
                        <span className="flex-1 min-w-0 break-words">{opt}</span>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-blue-400 bg-blue-500' : 'border-border'
                        }`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* ปุ่มส่งคำตอบ */}
            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={handleSubmitQuiz}
                disabled={submitting}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-8 py-3 rounded-xl transition disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
                {submitting ? 'กำลังส่งคำตอบ...' : 'ส่งแบบทดสอบ'}
              </button>
            </div>
          </div>
        )}

      </div>

      <ConfirmDialog
      open={confirmSubmitOpen}
      title="ยังตอบคำถามไม่ครบ"
      message={`คุณยังตอบคำถามไม่ครบทุกข้อ (${Object.keys(userAnswers).length}/${questions.length}) ต้องการส่งข้อสอบเลยหรือไม่?`}
      confirmText="ส่งข้อสอบเลย"
      cancelText="กลับไปตอบต่อ"
      onConfirm={() => {
        setConfirmSubmitOpen(false)
        submitQuiz()
      }}
      onCancel={() => setConfirmSubmitOpen(false)}
    />
    </div>
  )
}