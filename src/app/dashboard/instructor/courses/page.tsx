'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, BookOpen, HelpCircle, BarChart3, Trash2, Layers, FolderPlus, X } from 'lucide-react'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Skeleton from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

interface Course {
  id: string
  title: string
  description: string
  created_at: string
  lessons_count?: number
  questions_count?: number
}

export default function InstructorCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  // State สำหรับ Modal เพิ่มวิชาใหม่
  const [isCreating, setIsCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)

  const supabase = useMemo(() => createClient(), [])
  const { toast } = useToast()

  // ดึงข้อมูลรายวิชาทั้งหมด (ใช้ Relational Count แทน N+1 Query)
  const fetchCourses = async () => {
    setLoading(true)
    const { data: coursesData } = await supabase
      .from('courses')
      .select('*, lessons(count), questions(count)')
      .order('created_at', { ascending: false })

    if (coursesData) {
      const coursesWithCount = coursesData.map((course: any) => ({
        ...course,
        lessons_count: course.lessons?.[0]?.count || 0,
        questions_count: course.questions?.[0]?.count || 0,
      }))
      setCourses(coursesWithCount)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchCourses()
  }, [])

  // ฟังก์ชันเพิ่มวิชาใหม่
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) {
      toast('กรุณากรอกชื่อรายวิชา', 'warning')
      return
    }

    setSubmitting(true)

    // ดึง user เพื่อระบุ created_by
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast('กรุณาเข้าสู่ระบบก่อนดำเนินการ', 'info')
      setSubmitting(false)
      return
    }

    const { error } = await supabase.from('courses').insert([
      {
        title: newTitle,
        description: newDescription,
        created_by: user.id,
      },
    ])

    if (error) {
      toast('เกิดข้อผิดพลาดในการสร้างรายวิชา: ' + error.message, 'error')
    } else {
      toast('สร้างรายวิชาแล้ว', 'success')
      setNewTitle('')
      setNewDescription('')
      setIsCreating(false)
      fetchCourses()
    }
    setSubmitting(false)
  }

  // ฟังก์ชันลบรายวิชา
  const handleDeleteCourse = (id: string, title: string) => {
    setDeleteTarget({ id, title })
    setDeleteOpen(true)
  }

  const confirmDeleteCourse = async () => {
    if (!deleteTarget) return

    const { error } = await supabase.from('courses').delete().eq('id', deleteTarget.id)
    if (error) {
      toast('เกิดข้อผิดพลาดในการลบวิชา: ' + error.message, 'error')
    } else {
      toast('ลบรายวิชาแล้ว', 'success')
      fetchCourses()
    }
    setDeleteOpen(false)
    setDeleteTarget(null)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-96" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
              <Layers className="w-6 h-6 text-purple-600" /> ระบบจัดการรายวิชาสำหรับอาจารย์ (Instructor Portal)
            </h1>
            <p className="text-secondary text-sm">สร้างรายวิชา จัดการ 10 บทเรียนสั้น และคลังข้อสอบ Pre/Post-test</p>
          </div>

          <div className="flex items-center gap-3">
            {/* ปุ่มเข้าสู่หน้า Analytics */}
            <Link
              href="/dashboard/instructor/reports"
              className="flex items-center gap-2 bg-white hover:bg-surface text-ink border border-border font-medium px-4 py-2.5 rounded-xl text-sm transition shadow-sm"
            >
              <BarChart3 className="w-4 h-4 text-purple-600" />
              รายงาน Analytics
            </Link>

            {/* ปุ่มสร้างวิชาใหม่ */}
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              สร้างรายวิชาใหม่
            </button>
          </div>
        </div>

        {/* MODAL: เพิ่มวิชาใหม่ */}
        {isCreating && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-bold text-lg text-ink flex items-center gap-2">
                  <FolderPlus className="w-5 h-5 text-purple-600" /> เพิ่มรายวิชาใหม่
                </h3>
                <button onClick={() => setIsCreating(false)} className="text-secondary hover:text-ink">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateCourse} className="space-y-4">
                <div>
                  <label htmlFor="course-title" className="block text-xs font-semibold text-ink mb-1">ชื่อรายวิชา *</label>
                  <input
                    id="course-title"
                    type="text"
                    required
                    placeholder="เช่น การเขียนโปรแกรม Python เบื้องต้น"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-white border border-border rounded-lg p-2.5 text-sm text-ink focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label htmlFor="course-description" className="block text-xs font-semibold text-ink mb-1">คำอธิบายรายวิชาสังเขป</label>
                  <textarea
                    id="course-description"
                    rows={3}
                    placeholder="รายละเอียดวิชา..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full bg-white border border-border rounded-lg p-2.5 text-sm text-ink focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2 rounded-lg text-sm bg-white border border-border text-secondary hover:bg-surface transition"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg text-sm bg-purple-600 hover:bg-purple-500 text-white font-medium transition disabled:opacity-50"
                  >
                    {submitting ? 'กำลังบันทึก...' : 'บันทึกสร้างวิชา'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* รายการคอร์สเรียน */}
        {courses.length === 0 ? (
          <div className="bg-white border border-border rounded-2xl p-12 text-center space-y-3">
            <p className="text-secondary">ยังไม่มีรายวิชาในระบบผู้สอน</p>
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
            >
              <Plus className="w-4 h-4" /> เริ่มต้นสร้างรายวิชาแรก
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white border border-border rounded-2xl p-6 flex flex-col justify-between hover:border-muted transition shadow-sm group"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
                      รายวิชา
                    </span>
                    <button
                      onClick={() => handleDeleteCourse(course.id, course.title)}
                      className="text-secondary hover:text-rose-600 p-1 transition opacity-0 group-hover:opacity-100"
                      title="ลบรายวิชานี้"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-ink group-hover:text-purple-600 transition">
                      {course.title}
                    </h2>
                    <p className="text-secondary text-xs mt-1 line-clamp-2">
                      {course.description || 'ไม่มีคำอธิบายรายวิชา'}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-secondary pt-2 border-t border-border">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600" /> {course.lessons_count} บทเรียน
                    </span>
                    <span className="flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-purple-600" /> {course.questions_count} ข้อสอบ
                    </span>
                  </div>
                </div>

                {/* ปุ่มจัดการบทเรียนและคลังข้อสอบ */}
                <div className="grid grid-cols-2 gap-2 pt-6">
                  <Link
                    href={`/dashboard/instructor/courses/${course.id}/lessons`}
                    className="flex items-center justify-center gap-1.5 bg-surface hover:bg-border text-ink border border-border text-xs font-medium py-2 rounded-lg transition"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> จัดการบทเรียน
                  </Link>

                  <Link
                    href={`/dashboard/instructor/courses/${course.id}/questions`}
                    className="flex items-center justify-center gap-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 border border-purple-500/30 text-xs font-medium py-2 rounded-lg transition"
                  >
                    <HelpCircle className="w-3.5 h-3.5" /> จัดการข้อสอบ
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      <ConfirmDialog
      open={deleteOpen}
      title="ลบรายวิชา"
      message={deleteTarget ? `คุณต้องการลบรายวิชา "${deleteTarget.title}" ใช่หรือไม่? (บทเรียนและข้อสอบทั้งหมดจะถูกลบออกไปด้วย)` : ''}
      confirmText="ลบเลย"
      cancelText="ยกเลิก"
      tone="danger"
      onConfirm={confirmDeleteCourse}
      onCancel={() => {
        setDeleteOpen(false)
        setDeleteTarget(null)
      }}
    />
    </div>
  )
}
