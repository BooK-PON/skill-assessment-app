'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Plus, BookOpen, Trash2, Video, FileText, X } from 'lucide-react'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Skeleton from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

interface Lesson {
  id: string
  title: string
  content: string
  video_url: string
  pdf_url: string
  order_index: number
}

export default function AdminLessonsPage() {
  const params = useParams()
  const courseId = params.courseId as string
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [lessons, setLessons] = useState<Lesson[]>([])
  const [courseTitle, setCourseTitle] = useState('')
  const [loading, setLoading] = useState(true)

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [pdfUrl, setPdfUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)

  const { toast } = useToast()

  const fetchData = async () => {
    setLoading(true)
    // ดึงชื่อวิชา
    const { data: course } = await supabase
      .from('courses')
      .select('title')
      .eq('id', courseId)
      .single()
    if (course) setCourseTitle(course.title)

    // ดึงบทเรียนทั้งหมดในวิชานี้
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true })

    if (lessonsData) setLessons(lessonsData)
    setLoading(false)
  }

  useEffect(() => {
    if (courseId) fetchData()
  }, [courseId])

  // เพิ่มบทเรียนใหม่
  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast('กรุณากรอกชื่อบทเรียน', 'warning')
      return
    }

    setSubmitting(true)
    // ใช้ MAX(order_index)+1 เพื่อป้องกันเลขซ้ำหลังลบบทเรียน
    const { data: maxData } = await supabase
      .from('lessons')
      .select('order_index')
      .eq('course_id', courseId)
      .order('order_index', { ascending: false })
      .limit(1)
    const nextOrder = (maxData && maxData[0]?.order_index ? maxData[0].order_index : 0) + 1

    const { error } = await supabase.from('lessons').insert([
      {
        course_id: courseId,
        title,
        content,
        video_url: videoUrl,
        pdf_url: pdfUrl,
        order_index: nextOrder,
        lesson_number: nextOrder,
      },
    ])

    if (error) {
      toast('เกิดข้อผิดพลาด: ' + error.message, 'error')
    } else {
      toast('เพิ่มบทเรียนแล้ว', 'success')
      setTitle('')
      setContent('')
      setVideoUrl('')
      setPdfUrl('')
      setIsModalOpen(false)
      fetchData()
    }
    setSubmitting(false)
  }

  // ลบบทเรียน
  const handleDeleteLesson = (id: string, lessonTitle: string) => {
    setDeleteTarget({ id, title: lessonTitle })
    setDeleteOpen(true)
  }

  const confirmDeleteLesson = async () => {
    if (!deleteTarget) return

    const { error } = await supabase.from('lessons').delete().eq('id', deleteTarget.id)
    if (error) {
      toast('เกิดข้อผิดพลาด: ' + error.message, 'error')
    } else {
      toast('ลบบทเรียนแล้ว', 'success')
      fetchData()
    }
    setDeleteOpen(false)
    setDeleteTarget(null)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-96" />
          <div className="space-y-3">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="space-y-1">
            <button
              onClick={() => router.back()}
              className="text-secondary hover:text-ink flex items-center gap-1 text-xs transition mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> ย้อนกลับ
            </button>
            <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-600" /> จัดการบทเรียน: {courseTitle}
            </h1>
            <p className="text-secondary text-xs">ความยาวบทเรียนเป้าหมาย: 10 บทสั้น (มีบทเรียนแล้ว {lessons.length} บท)</p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-ink font-medium px-4 py-2 rounded-xl text-sm transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> เพิ่มบทเรียนใหม่
          </button>
        </div>

        {/* Modal เพิ่มบทเรียน */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white border border-border rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-sm">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-bold text-lg text-ink">เพิ่มบทเรียนที่ {lessons.length + 1}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-secondary hover:text-ink">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateLesson} className="space-y-3">
                <div>
                  <label htmlFor="lesson-title" className="block text-xs font-semibold text-ink mb-1">ชื่อบทเรียน *</label>
                  <input
                    id="lesson-title"
                    type="text"
                    required
                    placeholder="เช่น บทที่ 1: แนะนำเนื้อหาเบื้องต้น"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-white border border-border rounded-lg p-2.5 text-sm text-ink focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="lesson-content" className="block text-xs font-semibold text-ink mb-1">คำอธิบาย/เนื้อหาบทเรียน</label>
                  <textarea
                    id="lesson-content"
                    rows={3}
                    placeholder="สรุปเนื้อหาสั้นๆ ของบทนี้..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full bg-white border border-border rounded-lg p-2.5 text-sm text-ink focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div>
                  <label htmlFor="video-url" className="block text-xs font-semibold text-ink mb-1">URL คลิปวิดีโอ (YouTube หรือ Supabase Storage)</label>
                  <input
                    id="video-url"
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="w-full bg-white border border-border rounded-lg p-2.5 text-sm text-ink focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="pdf-url" className="block text-xs font-semibold text-ink mb-1">URL เอกสารประกอบ (PDF)</label>
                  <input
                    id="pdf-url"
                    type="url"
                    placeholder="https://.../document.pdf"
                    value={pdfUrl}
                    onChange={(e) => setPdfUrl(e.target.value)}
                    className="w-full bg-white border border-border rounded-lg p-2.5 text-sm text-ink focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-sm bg-surface text-secondary hover:bg-surface"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg text-sm bg-primary text-ink font-medium hover:bg-primary-dark disabled:opacity-50"
                  >
                    {submitting ? 'กำลังบันทึก...' : 'บันทึกบทเรียน'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* List บทเรียน */}
        {lessons.length === 0 ? (
          <div className="bg-white border border-border rounded-2xl p-12 text-center text-secondary">
            ยังไม่มีบทเรียนในรายวิชานี้ กดปุ่ม "เพิ่มบทเรียนใหม่" ด้านบนเพื่อเริ่มสร้าง
          </div>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson, idx) => (
              <div
                key={lesson.id}
                className="bg-white border border-border rounded-xl p-4 flex items-center justify-between hover:border-border transition"
              >
                <div className="flex items-start gap-4">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 font-bold text-sm border border-blue-500/20">
                    {idx + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-ink">{lesson.title}</h3>
                    <p className="text-secondary text-xs line-clamp-1 mt-0.5">{lesson.content || 'ไม่มีคำอธิบาย'}</p>
                    <div className="flex gap-4 mt-2 text-xs text-secondary">
                      {lesson.video_url && (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <Video className="w-3.5 h-3.5" /> มีวิดีโอ
                        </span>
                      )}
                      {lesson.pdf_url && (
                        <span className="flex items-center gap-1 text-purple-600">
                          <FileText className="w-3.5 h-3.5" /> มี PDF
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                  className="text-secondary hover:text-rose-600 p-2 transition"
                  title="ลบบทเรียน"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

      </div>

      <ConfirmDialog
      open={deleteOpen}
      title="ลบบทเรียน"
      message={deleteTarget ? `ต้องการลบบทเรียน "${deleteTarget.title}" หรือไม่?` : ''}
      confirmText="ลบเลย"
      cancelText="ยกเลิก"
      tone="danger"
      onConfirm={confirmDeleteLesson}
      onCancel={() => {
        setDeleteOpen(false)
        setDeleteTarget(null)
      }}
    />
    </div>
  )
}