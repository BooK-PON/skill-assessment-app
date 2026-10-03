'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Save, Video, FileText, BookOpen, HelpCircle } from 'lucide-react'
import Link from 'next/link'
import { SKILL_DIMENSIONS } from '@/lib/survey'

interface LessonInput {
  lesson_number: number
  title: string
  content: string
  video_url: string
  pdf_url: string
}

interface QuestionInput {
  lesson_number: number
  question_text: string
  options: string[]
  correct_answer: number
  skill_dimension: string
}

export default function CreateCoursePage() {
  const { toast } = useToast()
  const [courseTitle, setCourseTitle] = useState('')
  const [courseDescription, setCourseDescription] = useState('')

  // เริ่มต้นสร้างบทเรียนแรกไว้ 1 บท (อาจารย์สามารถกดเพิ่มเป็น 10 บทได้)
  const [lessons, setLessons] = useState<LessonInput[]>([
    { lesson_number: 1, title: 'บทที่ 1: ปูพื้นฐานความรู้', content: '', video_url: '', pdf_url: '' }
  ])

  // เริ่มต้นสร้างข้อสอบแรก
  const [questions, setQuestions] = useState<QuestionInput[]>([
    { lesson_number: 1, question_text: '', options: ['', '', '', ''], correct_answer: 0, skill_dimension: 'knowledge' }
  ])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  // --- จัดการบทเรียน ---
  const handleAddLesson = () => {
    const nextNum = lessons.length + 1
    setLessons([
      ...lessons,
      { lesson_number: nextNum, title: `บทที่ ${nextNum}: `, content: '', video_url: '', pdf_url: '' }
    ])
  }

  const handleRemoveLesson = (index: number) => {
    if (lessons.length === 1) return
    const updated = lessons.filter((_, i) => i !== index).map((l, i) => ({ ...l, lesson_number: i + 1 }))
    setLessons(updated)
  }

  const handleLessonChange = (index: number, field: keyof LessonInput, value: any) => {
    const updated = [...lessons]
    updated[index] = { ...updated[index], [field]: value }
    setLessons(updated)
  }

  // --- จัดการข้อสอบ ---
  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      { lesson_number: 1, question_text: '', options: ['', '', '', ''], correct_answer: 0, skill_dimension: 'knowledge' }
    ])
  }

  const handleRemoveQuestion = (index: number) => {
    if (questions.length === 1) return
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const handleQuestionChange = (index: number, field: keyof QuestionInput, value: any) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value }
    setQuestions(updated)
  }

  const handleOptionChange = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...questions]
    updated[qIndex].options[oIndex] = value
    setQuestions(updated)
  }

  // --- บันทึกลง Supabase ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('กรุณาล็อกอินก่อนดำเนินการ')

      // 1. สร้างวิชา (courses)
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .insert([{ title: courseTitle, description: courseDescription, created_by: user.id }])
        .select()
        .single()

      if (courseError) throw courseError

      // 2. สร้างบทเรียน (lessons)
      const formattedLessons = lessons.map(l => ({
        course_id: courseData.id,
        order_index: l.lesson_number,
        lesson_number: l.lesson_number,
        title: l.title,
        content: l.content,
        video_url: l.video_url,
        pdf_url: l.pdf_url
      }))

      const { data: insertedLessons, error: lessonsError } = await supabase
        .from('lessons')
        .insert(formattedLessons)
        .select()

      if (lessonsError) throw lessonsError

      // สร้าง Map หา lesson_id จาก order_index
      const lessonMap = new Map<number, string>()
      insertedLessons?.forEach(l => lessonMap.set(l.order_index, l.id))

      // 3. สร้างข้อสอบ (questions) ผูกกับ course_id และ lesson_id
      const formattedQuestions = questions.map(q => ({
        course_id: courseData.id,
        lesson_id: lessonMap.get(q.lesson_number) || null,
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.correct_answer,
        skill_dimension: q.skill_dimension || 'knowledge'
      }))

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(formattedQuestions)

      if (questionsError) throw questionsError

      toast('สร้างวิชา บทเรียนสื่อการสอน และคลังข้อสอบสำเร็จ!', 'success')
      router.push('/dashboard/instructor/courses')
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 bg-white hover:bg-surface rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-ink" />
            </Link>
            <h1 className="text-2xl font-bold text-ink">สร้างคอร์สเรียน & สื่อการสอน (Video/PDF)</h1>
          </div>
        </div>

        {error && (
          <div role="alert" className="bg-red-500/10 border border-red-500/20 text-red-600 p-4 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* SECTION 1: รายละเอียดรายวิชา */}
          <div className="bg-white border border-border rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-indigo-600 flex items-center gap-2">
              <BookOpen className="w-5 h-5" /> 1. ข้อมูลรายวิชา
            </h2>
            <div>
              <label htmlFor="course-title" className="block text-sm font-medium text-secondary mb-1">ชื่อรายวิชา *</label>
              <input
                id="course-title"
                type="text"
                required
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                placeholder="เช่น การพัฒนาเว็บแอปพลิเคชันด้วย Next.js และ Supabase"
                className="w-full bg-white border border-border rounded-lg px-4 py-2.5 text-ink focus:outline-none focus:border-primary-dark"
              />
            </div>
            <div>
              <label htmlFor="course-description" className="block text-sm font-medium text-secondary mb-1">รายละเอียดคอร์สเรียน</label>
              <textarea
                id="course-description"
                rows={2}
                value={courseDescription}
                onChange={(e) => setCourseDescription(e.target.value)}
                placeholder="คำอธิบายสั้นๆ เกี่ยวกับทักษะที่จะได้เรียนรู้ในคอร์สนี้..."
                className="w-full bg-white border border-border rounded-lg px-4 py-2.5 text-ink focus:outline-none focus:border-primary-dark"
              />
            </div>
          </div>

          {/* SECTION 2: จัดการบทเรียน (10 บทเรียน + Video/PDF Links) */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-indigo-600 flex items-center gap-2">
                  <Video className="w-5 h-5" /> 2. จัดการบทเรียนสื่อการสอน ({lessons.length} บท)
                </h2>
                <p className="text-xs text-secondary">สามารถใส่คลิปวิดีโอสั้น (YouTube/MP4) และไฟล์เอกสาร PDF ประจำบทเรียนได้</p>
              </div>
              <button
                type="button"
                onClick={handleAddLesson}
                className="flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition"
              >
                <Plus className="w-4 h-4" /> เพิ่มบทเรียน
              </button>
            </div>

            {lessons.map((lesson, lIndex) => (
              <div key={lIndex} className="bg-white border border-border rounded-xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <span className="font-bold text-ink text-sm">บทที่ {lesson.lesson_number}</span>
                  {lessons.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLesson(lIndex)}
                      className="text-red-600 hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor={`lesson-title-${lIndex}`} className="block text-xs font-medium text-secondary mb-1">ชื่อหัวข้อบทเรียน *</label>
                    <input
                      id={`lesson-title-${lIndex}`}
                      type="text"
                      required
                      value={lesson.title}
                      onChange={(e) => handleLessonChange(lIndex, 'title', e.target.value)}
                      placeholder="เช่น บทที่ 1: แนะนำพื้นฐาน React Component"
                      className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-primary-dark"
                    />
                  </div>
                  <div>
                    <label htmlFor={`lesson-content-${lIndex}`} className="block text-xs font-medium text-secondary mb-1">รายละเอียดสังเขป</label>
                    <input
                      id={`lesson-content-${lIndex}`}
                      type="text"
                      value={lesson.content}
                      onChange={(e) => handleLessonChange(lIndex, 'content', e.target.value)}
                      placeholder="สรุปเนื้อหาสำคัญในบทเรียนนี้..."
                      className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-primary-dark"
                    />
                  </div>
                </div>

                {/* แหล่งข้อมูลสื่อการสอน (Video / PDF) */}
                <div className="grid md:grid-cols-2 gap-4 bg-surface p-4 rounded-lg border border-border">
                  <div>
                    <label htmlFor={`video-url-${lIndex}`} className="block text-xs font-medium text-blue-600 mb-1 flex items-center gap-1">
                      <Video className="w-3.5 h-3.5" /> ลิงก์คลิปวิดีโอสั้น (YouTube / MP4 / Cloud URL)
                    </label>
                    <input
                      id={`video-url-${lIndex}`}
                      type="url"
                      value={lesson.video_url}
                      onChange={(e) => handleLessonChange(lIndex, 'video_url', e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full bg-white border border-border rounded-lg px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor={`pdf-url-${lIndex}`} className="block text-xs font-medium text-emerald-600 mb-1 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> ลิงก์เอกสารสอน PDF (Google Drive / Direct PDF URL)
                    </label>
                    <input
                      id={`pdf-url-${lIndex}`}
                      type="url"
                      value={lesson.pdf_url}
                      onChange={(e) => handleLessonChange(lIndex, 'pdf_url', e.target.value)}
                      placeholder="https://example.com/document.pdf"
                      className="w-full bg-white border border-border rounded-lg px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* SECTION 3: คลังข้อสอบผูกกับบทเรียน */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-indigo-600 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" /> 3. คลังข้อสอบผูกประจำบทเรียน ({questions.length} ข้อ)
                </h2>
                <p className="text-xs text-secondary">สร้างข้อสอบให้กระจายในแต่ละบทเรียน ระบบจะทำการสุ่ม 20 ข้อมาใช้ทำ Pre-test และ Post-test</p>
              </div>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition"
              >
                <Plus className="w-4 h-4" /> เพิ่มข้อสอบ
              </button>
            </div>

            {questions.map((q, qIndex) => (
              <div key={qIndex} className="bg-white border border-border rounded-xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-ink text-sm">ข้อที่ {qIndex + 1}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-secondary">ประจำบทเรียน:</span>
                      <select
                        value={q.lesson_number}
                        onChange={(e) => handleQuestionChange(qIndex, 'lesson_number', Number(e.target.value))}
                        className="bg-white border border-border text-xs rounded-md px-2 py-1 text-ink focus:outline-none"
                      >
                        {lessons.map(l => (
                          <option key={l.lesson_number} value={l.lesson_number}>
                            บทที่ {l.lesson_number}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-secondary">ทักษะ:</span>
                      <select
                        value={q.skill_dimension}
                        onChange={(e) => handleQuestionChange(qIndex, 'skill_dimension', e.target.value)}
                        className="bg-white border border-border text-xs rounded-md px-2 py-1 text-ink focus:outline-none"
                      >
                        {SKILL_DIMENSIONS.map((s) => (
                          <option key={s.key} value={s.key}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIndex)}
                      className="text-red-600 hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div>
                  <input
                    type="text"
                    required
                    placeholder="โจทย์คำถาม..."
                    value={q.question_text}
                    onChange={(e) => handleQuestionChange(qIndex, 'question_text', e.target.value)}
                    className="w-full bg-white border border-border rounded-lg px-4 py-2 text-sm text-ink focus:outline-none focus:border-primary-dark"
                  />
                </div>

                {/* ตัวเลือก 4 ข้อ */}
                <div className="grid md:grid-cols-2 gap-3">
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <span className="text-xs text-secondary font-bold">{oIndex + 1}.</span>
                      <input
                        type="text"
                        required
                        placeholder={`ตัวเลือกที่ ${oIndex + 1}`}
                        value={opt}
                        onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                        className="w-full bg-white border border-border rounded-lg px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-primary-dark"
                      />
                    </div>
                  ))}
                </div>

                {/* เฉลย */}
                <div>
                  <label htmlFor={`correct-answer-${qIndex}-0`} className="block text-xs font-medium text-secondary mb-2">ระบุตัวเลือกที่ถูกต้อง *</label>
                  <div className="grid md:grid-cols-4 gap-2">
                    {q.options.map((opt, oIndex) => (
                      <label
                        key={oIndex}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer transition ${
                          q.correct_answer === oIndex
                            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-600'
                            : 'bg-white border-border text-secondary hover:border-muted'
                        }`}
                      >
                        <input
                          type="radio"
                          id={oIndex === 0 ? `correct-answer-${qIndex}-0` : undefined}
                          name={`correct-${qIndex}`}
                          checked={q.correct_answer === oIndex}
                          onChange={() => handleQuestionChange(qIndex, 'correct_answer', oIndex)}
                          className="w-3.5 h-3.5"
                        />
                        <span className="truncate">{oIndex + 1}. {opt || `ตัวเลือกที่ ${oIndex + 1}`}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-8 py-3 rounded-xl transition disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {loading ? 'กำลังบันทึกข้อมูล...' : 'บันทึกรายวิชาและบทเรียน'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
