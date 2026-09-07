'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Plus, HelpCircle, Trash2, CheckCircle, X, BookOpen } from 'lucide-react'
import { SKILL_DIMENSIONS, SKILL_DIMENSION_LABELS } from '@/lib/survey'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Skeleton from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

interface Lesson {
  id: string
  title: string
  order_index: number
}

interface Question {
  id: string
  lesson_id: string
  question_text: string
  options: string[]
  correct_answer: number
  skill_dimension?: string
  lessons?: { title: string; order_index: number }
}

const skillBadgeClass: Record<string, string> = {
  knowledge: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  analysis: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  application: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  problem_solving: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  creativity: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
}

export default function InstructorQuestionsPage() {
  const params = useParams()
  const courseId = params.courseId as string
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [lessons, setLessons] = useState<Lesson[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [courseTitle, setCourseTitle] = useState('')
  const [selectedLessonFilter, setSelectedLessonFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [targetLessonId, setTargetLessonId] = useState('')
  const [questionText, setQuestionText] = useState('')
  const [options, setOptions] = useState(['', '', '', ''])
  const [correctAnswer, setCorrectAnswer] = useState(0)
  const [skillDimension, setSkillDimension] = useState('knowledge')
  const [submitting, setSubmitting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { toast } = useToast()

  const fetchData = async () => {
    setLoading(true)
    const { data: course } = await supabase.from('courses').select('title').eq('id', courseId).single()
    if (course) setCourseTitle(course.title)

    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('id, title, order_index')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true })

    if (lessonsData) {
      setLessons(lessonsData)
      if (lessonsData.length > 0 && !targetLessonId) {
        setTargetLessonId(lessonsData[0].id)
      }
    }

    const { data: qData } = await supabase
      .from('questions')
      .select('*, lessons(title, order_index)')
      .eq('course_id', courseId)
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

  useEffect(() => {
    if (courseId) fetchData()
  }, [courseId])

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetLessonId) {
      toast('กรุณาเลือกบทเรียนสำหรับข้อสอบนี้', 'warning')
      return
    }
    if (!questionText.trim()) {
      toast('กรุณากรอกโจทย์คำถาม', 'warning')
      return
    }
    if (options.some((opt) => !opt.trim())) {
      toast('กรุณากรอกตัวเลือกให้ครบทั้ง 4 ข้อ', 'warning')
      return
    }

    setSubmitting(true)
    const { error } = await supabase.from('questions').insert([
      {
        course_id: courseId,
        lesson_id: targetLessonId,
        question_text: questionText,
        options: options,
        correct_answer: Number(correctAnswer),
        skill_dimension: skillDimension,
      },
    ])

    if (error) {
      toast('เกิดข้อผิดพลาด: ' + error.message, 'error')
    } else {
      toast('เพิ่มข้อสอบแล้ว', 'success')
      setQuestionText('')
      setOptions(['', '', '', ''])
      setCorrectAnswer(0)
      setSkillDimension('knowledge')
      setIsModalOpen(false)
      fetchData()
    }
    setSubmitting(false)
  }

  const handleDeleteQuestion = (id: string) => {
    setDeleteId(id)
    setDeleteOpen(true)
  }

  const confirmDeleteQuestion = async () => {
    if (!deleteId) return
    const { error } = await supabase.from('questions').delete().eq('id', deleteId)
    if (error) {
      toast('เกิดข้อผิดพลาด: ' + error.message, 'error')
    } else {
      toast('ลบข้อสอบแล้ว', 'success')
      fetchData()
    }
    setDeleteOpen(false)
    setDeleteId(null)
  }

  const filteredQuestions = selectedLessonFilter === 'all'
    ? questions
    : questions.filter(q => q.lesson_id === selectedLessonFilter)

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-12 rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <button
              onClick={() => router.back()}
              className="text-secondary hover:text-ink flex items-center gap-1 text-xs transition mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> ย้อนกลับ
            </button>
            <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-purple-600" /> คลังข้อสอบ: {courseTitle}
            </h1>
            <p className="text-secondary text-xs mt-1">
              สร้างข้อสอบย่อยประจำบทเรียน สำหรับทำแบบทดสอบหลังดูคลิป/PDF
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            disabled={lessons.length === 0}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition shadow-sm disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> เพิ่มข้อสอบเข้าบทเรียน
          </button>
        </div>

        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-border">
          <BookOpen className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-semibold text-ink">กรองดูตามบทเรียน:</span>
          <select
            value={selectedLessonFilter}
            onChange={(e) => setSelectedLessonFilter(e.target.value)}
            className="bg-white border border-border rounded-lg px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-purple-500"
          >
            <option value="all">แสดงข้อสอบทั้งหมดในวิชานี้ ({questions.length} ข้อ)</option>
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                บทที่ {lesson.order_index}: {lesson.title} ({questions.filter(q => q.lesson_id === lesson.id).length} ข้อ)
              </option>
            ))}
          </select>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white border border-border rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-xl">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-bold text-lg text-ink">เพิ่มข้อสอบประจำบทเรียน</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-secondary hover:text-ink">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateQuestion} className="space-y-4">
                <div>
                  <label htmlFor="target-lesson" className="block text-xs font-semibold text-ink mb-1">สังกัดบทเรียน *</label>
                  <select
                    id="target-lesson"
                    value={targetLessonId}
                    onChange={(e) => setTargetLessonId(e.target.value)}
                    className="w-full bg-white border border-border rounded-lg p-2.5 text-sm text-ink focus:outline-none focus:border-purple-500"
                  >
                    {lessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        บทที่ {lesson.order_index}: {lesson.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="skill-dimension" className="block text-xs font-semibold text-ink mb-1">ทักษะที่ต้องการวัด *</label>
                  <select
                    id="skill-dimension"
                    value={skillDimension}
                    onChange={(e) => setSkillDimension(e.target.value)}
                    className="w-full bg-white border border-border rounded-lg p-2.5 text-sm text-ink focus:outline-none focus:border-purple-500"
                  >
                    {SKILL_DIMENSIONS.map((s) => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-secondary mt-1">
                    ใช้คำนวณกราฟทักษะและระบบแนะนำคอร์สเรียนต่อของผู้เรียน
                  </p>
                </div>

                <div>
                  <label htmlFor="question-text" className="block text-xs font-semibold text-ink mb-1">โจทย์คำถาม *</label>
                  <textarea
                    id="question-text"
                    rows={2}
                    required
                    placeholder="พิมพ์โจทย์คำถาม..."
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    className="w-full bg-white border border-border rounded-lg p-2.5 text-sm text-ink focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="option-0" className="block text-xs font-semibold text-ink">ตัวเลือก 4 ข้อ (เลือกข้อที่ถูก) *</label>
                  {options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="radio"
                        id={i === 0 ? 'option-0' : undefined}
                        name="correct"
                        checked={correctAnswer === i}
                        onChange={() => setCorrectAnswer(i)}
                        className="w-4 h-4 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                      <input
                        type="text"
                        required
                        placeholder={`ตัวเลือกที่ ${i + 1}`}
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...options]
                          newOpts[i] = e.target.value
                          setOptions(newOpts)
                        }}
                        className="w-full bg-white border border-border rounded-lg p-2 text-xs text-ink focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-sm bg-white border border-border text-secondary hover:bg-surface"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg text-sm bg-purple-600 text-white font-medium hover:bg-purple-500 disabled:opacity-50"
                  >
                    {submitting ? 'กำลังบันทึก...' : 'บันทึกข้อสอบ'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {filteredQuestions.length === 0 ? (
          <div className="bg-white border border-border rounded-2xl p-12 text-center text-secondary">
            ยังไม่มีข้อสอบในเงื่อนไขที่เลือก
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((q, idx) => (
              <div
                key={q.id}
                className="bg-white border border-border rounded-xl p-5 space-y-3 relative hover:border-muted transition"
              >
                <div className="flex justify-between items-start pr-8">
                  <div>
                    <span className="inline-block bg-purple-500/10 text-purple-600 border border-purple-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-semibold mb-1">
                      บทที่ {q.lessons?.order_index || '-'}: {q.lessons?.title || 'ทั่วไป'}
                    </span>
                    <span className={`inline-block ml-1.5 text-[10px] px-2.5 py-0.5 rounded-full border font-semibold mb-1 ${skillBadgeClass[q.skill_dimension || 'knowledge']}`}>
                      ทักษะ: {SKILL_DIMENSION_LABELS[q.skill_dimension || 'knowledge']}
                    </span>
                    <h3 className="font-medium text-ink text-sm">
                      <span className="text-purple-600 font-bold mr-2">ข้อที่ {idx + 1}.</span> {q.question_text}
                    </h3>
                  </div>
                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="text-secondary hover:text-rose-600 p-1 absolute top-4 right-4 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  {q.options.map((opt, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-lg border flex items-center justify-between ${
                        Number(q.correct_answer) === i
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 font-medium'
                          : 'bg-surface border-border text-secondary'
                      }`}
                    >
                      <span>{i + 1}. {opt}</span>
                      {Number(q.correct_answer) === i && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      <ConfirmDialog
      open={deleteOpen}
      title="ลบข้อสอบ"
      message="ต้องการลบข้อสอบข้อนี้หรือไม่?"
      confirmText="ลบเลย"
      cancelText="ยกเลิก"
      tone="danger"
      onConfirm={confirmDeleteQuestion}
      onCancel={() => {
        setDeleteOpen(false)
        setDeleteId(null)
      }}
    />
    </div>
  )
}
