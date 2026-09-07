'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { ArrowLeft, BookOpen, CheckCircle2, HelpCircle, PlayCircle, FileText, ArrowRight } from 'lucide-react'
import Skeleton from '@/components/ui/Skeleton'

interface Lesson {
  id: string
  title: string
  content: string
  video_url: string
  pdf_url: string
  order_index: number
}

interface Question {
  id: string
  question_text: string
  options: string[]
  correct_answer: number
  skill_dimension?: string
}

// แปลง URL YouTube หลายรูปแบบให้เป็น embed URL
function toYouTubeEmbedUrl(url: string): string | null {
  try {
    let videoId: string | null = null

    if (url.includes('watch?v=')) {
      videoId = new URL(url).searchParams.get('v')
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0] || null
    } else if (url.includes('/embed/')) {
      videoId = url.split('/embed/')[1]?.split('?')[0] || null
    }

    return videoId ? `https://www.youtube.com/embed/${videoId}` : null
  } catch {
    return null
  }
}

export default function StudentLessonPage() {
  const params = useParams()
  const courseId = params.courseId as string
  const lessonId = params.lessonId as string
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { toast } = useToast()

  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  // State สำหรับการสลับโหมด (content = เรียนเนื้อหา, quiz = ทำข้อสอบ, result = ผลคะแนน)
  const [mode, setMode] = useState<'content' | 'quiz' | 'result'>('content')
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({})
  const [score, setScore] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [nextLessonId, setNextLessonId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLessonData() {
      setLoading(true)
      
      // 1. ดึงข้อมูลบทเรียน (ตรวจสอบ course_id ด้วยเพื่อกันเข้าบทเรียนคอร์สอื่น)
      const { data: lessonData } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .eq('course_id', courseId)
        .single()

      if (lessonData) {
        setLesson(lessonData)

        // หาบทเรียนถัดไป: ใช้ชุดบทเรียนที่เรียงแล้ว หา index ปัจจุบันแล้ว +1 (รองรับ order_index ที่ไม่ต่อเนื่อง)
        const { data: courseLessons } = await supabase
          .from('lessons')
          .select('id, order_index')
          .eq('course_id', courseId)
          .order('order_index', { ascending: true })

        if (courseLessons) {
          const currentIdx = courseLessons.findIndex(l => l.id === lessonId)
          if (currentIdx !== -1 && currentIdx < courseLessons.length - 1) {
            setNextLessonId(courseLessons[currentIdx + 1].id)
          }
        }
      }

      // 2. ดึงข้อสอบประจำบทเรียนนี้ (ผูกกับ lesson_id)
      const { data: qData } = await supabase
        .from('questions')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: true })

      if (qData) {
        setQuestions(
          qData.map((q) => {
            let parsedOptions: string[] = []
            try {
              parsedOptions = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
            } catch {
              parsedOptions = []
            }
            return { ...q, options: parsedOptions }
          })
        )
      }

      setLoading(false)
    }

    if (lessonId) fetchLessonData()
  }, [courseId, lessonId])

  // คำนวณคะแนนและบันทึกผลลง Supabase
  const handleSubmitQuiz = async () => {
    if (Object.keys(userAnswers).length < questions.length) {
      toast('กรุณาตอบคำถามให้ครบทุกข้อก่อนส่งแบบทดสอบ', 'warning')
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

    // บันทึกคะแนนควิซประจำบทลงตาราง assessment_scores
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (user) {
        const percentage = Number(((calculatedScore / questions.length) * 100).toFixed(2))
        // ลบผลเดิมของบทนี้ก่อน (กันซ้ำ) แล้ว insert ผลใหม่
        const { error: deleteError } = await supabase
          .from('assessment_scores')
          .delete()
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .eq('lesson_id', lessonId)
          .eq('assessment_type', 'lesson_quiz')
        if (deleteError) throw deleteError

        const { data: inserted, error } = await supabase.from('assessment_scores').insert([
          {
            user_id: user.id,
            course_id: courseId,
            lesson_id: lessonId,
            score: calculatedScore,
            total_questions: questions.length,
            percentage,
            assessment_type: 'lesson_quiz',
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
            assessment_type: 'lesson_quiz',
            skill_dimension: q.skill_dimension || 'knowledge',
            answer_index: userAnswers[idx] ?? null,
            is_correct: userAnswers[idx] === Number(q.correct_answer),
          }))
          const { error: attemptsError } = await supabase
            .from('assessment_attempts')
            .insert(attempts)
          if (attemptsError) throw attemptsError
        }
      }
    } catch (err: any) {
      toast('เกิดข้อผิดพลาดในการบันทึกคะแนน: ' + (err.message || 'กรุณาลองใหม่'), 'error')
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    setMode('result')
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-64 rounded-2xl" />
          <div className="flex justify-end">
            <Skeleton className="h-12 w-56 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-rose-600">ไม่พบข้อมูลบทเรียนนี้</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Top Header Navigation */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <button
            onClick={() => router.push(`/dashboard/student/courses/${courseId}`)}
            className="text-secondary hover:text-ink flex items-center gap-1 text-xs transition"
          >
            <ArrowLeft className="w-4 h-4" /> กลับสู่หน้ารายวิชา
          </button>
          <span className="text-xs bg-blue-500/10 text-blue-600 border border-blue-500/20 px-3 py-1 rounded-full font-semibold">
            บทเรียนที่ {lesson.order_index}
          </span>
        </div>

        {/* MODE 1: ดูเนื้อหา (Video & PDF) */}
        {mode === 'content' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-blue-600" /> {lesson.title}
              </h1>
              <p className="text-secondary text-sm mt-2 leading-relaxed">{lesson.content || 'ไม่มีเนื้อหาเพิ่มเติม'}</p>
            </div>

            {/* ส่วนเล่นวิดีโอ */}
            {lesson.video_url && (
              <div className="bg-white border border-border rounded-2xl p-4 space-y-3 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                  <PlayCircle className="w-4 h-4" /> วิดีโอประกอบการเรียน
                </div>
                <div className="aspect-video bg-black rounded-xl overflow-hidden border border-border">
                  {lesson.video_url.includes('youtube.com') || lesson.video_url.includes('youtu.be') ? (
                    <iframe
                      src={toYouTubeEmbedUrl(lesson.video_url) || lesson.video_url}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  ) : (
                    <video src={lesson.video_url} controls className="w-full h-full" />
                  )}
                </div>
              </div>
            )}

            {/* ส่วนเอกสาร PDF */}
            {lesson.pdf_url && (
              <div className="bg-white border border-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-6 h-6 text-purple-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">เอกสารประกอบการเรียน (PDF)</p>
                    <p className="text-xs text-secondary">ดาวน์โหลดหรือเปิดดูเนื้อหาเพิ่มเติม</p>
                  </div>
                </div>
                <a
                  href={lesson.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-surface hover:bg-surface border border-border text-ink text-xs px-4 py-2 rounded-lg font-medium transition"
                >
                  เปิดเอกสาร PDF
                </a>
              </div>
            )}

            {/* ปุ่มเข้าสู่แบบทดสอบประจำบทเรียน */}
            <div className="pt-4 border-t border-border flex justify-end">
              <button
                onClick={() => setMode('quiz')}
                disabled={questions.length === 0}
                className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-ink font-medium px-6 py-3 rounded-xl transition shadow-sm disabled:opacity-50"
              >
                <HelpCircle className="w-5 h-5" />
                {questions.length > 0 ? `ทำแบบทดสอบประจำบทเรียน (${questions.length} ข้อ)` : 'ยังไม่มีแบบทดสอบในบทนี้'}
              </button>
            </div>
          </div>
        )}

        {/* MODE 2: ทำแบบทดสอบประจำบท (Quiz) */}
        {mode === 'quiz' && (
          <div className="space-y-6">
            <div className="border-b border-border pb-3">
              <h2 className="text-xl font-bold text-ink flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-purple-600" /> แบบทดสอบประจำบทเรียน: {lesson.title}
              </h2>
              <p className="text-secondary text-xs mt-1">ตอบคำถามให้ครบทุกข้อเพื่อบันทึกผลการเรียนรู้</p>
            </div>

            <div className="space-y-6">
              {questions.map((q, idx) => (
                <div key={q.id} className="bg-white border border-border rounded-xl p-5 space-y-3">
                  <p className="font-semibold text-ink text-sm">
                    <span className="text-blue-600 mr-2">ข้อที่ {idx + 1}.</span> {q.question_text}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => (
                      <label
                        key={optIdx}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition text-xs ${
                          userAnswers[idx] === optIdx
                            ? 'bg-blue-500/10 border-blue-500 text-blue-600 font-medium'
                            : 'bg-surface border-border text-ink hover:bg-surface'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${idx}`}
                          checked={userAnswers[idx] === optIdx}
                          onChange={() => setUserAnswers({ ...userAnswers, [idx]: optIdx })}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4">
              <button
                onClick={() => setMode('content')}
                className="text-secondary hover:text-ink text-xs transition"
              >
                ย้อนกลับไปดูเนื้อหา
              </button>
              <button
                onClick={handleSubmitQuiz}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-2.5 rounded-xl transition shadow-sm disabled:opacity-50 text-sm"
              >
                {submitting ? 'กำลังส่งแบบทดสอบ...' : 'ส่งแบบทดสอบ'}
              </button>
            </div>
          </div>
        )}

        {/* MODE 3: แสดงสรุปผลคะแนน (Result) */}
        {mode === 'result' && (
          <div className="bg-white border border-border rounded-2xl p-8 text-center space-y-6 shadow-sm">
            <div className="inline-flex p-4 bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-ink">ยินดีด้วย! คุณเรียนจบบทเรียนนี้แล้ว</h2>
              <p className="text-secondary text-sm">คะแนนแบบทดสอบประจำบทเรียนของคุณ</p>
            </div>

            <div className="inline-block bg-surface border border-border px-8 py-4 rounded-xl">
              <span className="text-4xl font-extrabold text-emerald-600">{score}</span>
              <span className="text-secondary text-lg"> / {questions.length} คะแนน</span>
            </div>

            <div className="pt-4 flex justify-center gap-3">
              <button
                onClick={() => setMode('content')}
                className="bg-surface hover:bg-surface border border-border text-ink text-sm font-medium px-5 py-2.5 rounded-xl transition"
              >
                ทบทวนเนื้อหาบทนี้
              </button>

              {nextLessonId ? (
                <button
                  onClick={() => router.push(`/dashboard/student/courses/${courseId}/lessons/${nextLessonId}`)}
                  className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-ink text-sm font-medium px-6 py-2.5 rounded-xl transition shadow-sm"
                >
                  เรียนบทถัดไป <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => router.push(`/dashboard/student/courses/${courseId}`)}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition shadow-md"
                >
                  ทำแบบทดสอบ Post-test ท้ายรายวิชา <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}