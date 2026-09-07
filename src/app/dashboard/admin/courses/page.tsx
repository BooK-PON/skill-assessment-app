'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, BookOpen, HelpCircle, BarChart3, Trash2, Layers, Pencil, Users, Eye, EyeOff } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Skeleton from '@/components/ui/Skeleton'

interface Course {
  id: string
  title: string
  description: string
  created_at: string
  status?: string
  lessons_count?: number
  questions_count?: number
  enrollments_count?: number
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  // State สำหรับ Modal เพิ่มวิชาใหม่
  const [isCreating, setIsCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // State สำหรับ Modal แก้ไขวิชา
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editing, setEditing] = useState(false)

  // State สำหรับยืนยันลบ
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const supabase = useMemo(() => createClient(), [])
  const { toast } = useToast()

  // ฟังก์ชันดึงข้อมูลรายวิชาพร้อมจำนวนบทเรียนและข้อสอบ (Relational Count แทน N+1)
  const fetchCourses = async () => {
    setLoading(true)
    const { data: coursesData } = await supabase
      .from('courses')
      .select('*, lessons(count), questions(count), enrollments(count)')
      .order('created_at', { ascending: false })

    if (coursesData) {
      const coursesWithCount = coursesData.map((course: any) => ({
        ...course,
        lessons_count: course.lessons?.[0]?.count || 0,
        questions_count: course.questions?.[0]?.count || 0,
        enrollments_count: course.enrollments?.[0]?.count || 0,
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
    if (submitting) return

    setSubmitting(true)

    // ดึง user เพื่อระบุ created_by
    const { data: { user } } = await supabase.auth.getUser()

    const insertData: any = {
      title: newTitle.trim(),
      description: newDescription.trim(),
      status: 'published',
    }
    if (user) insertData.created_by = user.id

    const { error } = await supabase.from('courses').insert([insertData])

    if (error) {
      toast('เกิดข้อผิดพลาดในการสร้างรายวิชา: ' + error.message, 'error')
    } else {
      await supabase.from('activity_logs').insert([
        {
          user_id: user?.id ?? null,
          action: 'create_course',
          target_type: 'course',
          detail: `สร้างรายวิชา "${newTitle.trim()}"`,
        },
      ]).then(() => {})
      setNewTitle('')
      setNewDescription('')
      setIsCreating(false)
      fetchCourses()
    }
    setSubmitting(false)
  }

  // เปิด Modal แก้ไขวิชา
  const openEdit = (course: Course) => {
    setEditingCourse(course)
    setEditTitle(course.title)
    setEditDescription(course.description || '')
  }

  // ฟังก์ชันบันทึกการแก้ไขวิชา
  const handleEditCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCourse || !editTitle.trim()) {
      toast('กรุณากรอกชื่อรายวิชา', 'warning')
      return
    }
    if (editing) return
    setEditing(true)

    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('courses')
      .update({ title: editTitle.trim(), description: editDescription.trim() })
      .eq('id', editingCourse.id)

    if (error) {
      toast('เกิดข้อผิดพลาดในการแก้ไขรายวิชา: ' + error.message, 'error')
    } else {
      await supabase.from('activity_logs').insert([
        {
          user_id: user?.id ?? null,
          action: 'edit_course',
          target_type: 'course',
          target_id: editingCourse.id,
          detail: `แก้ไขรายวิชา "${editTitle.trim()}"`,
        },
      ]).then(() => {})
      setEditingCourse(null)
      fetchCourses()
    }
    setEditing(false)
  }

  // ฟังก์ชันสลับสถานะเผยแพร่ (published / draft)
  const togglePublish = async (course: Course) => {
    const next = course.status === 'published' ? 'draft' : 'published'
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('courses')
      .update({ status: next })
      .eq('id', course.id)

    if (error) {
      toast('เกิดข้อผิดพลาด: ' + error.message, 'error')
    } else {
      await supabase.from('activity_logs').insert([
        {
          user_id: user?.id ?? null,
          action: 'toggle_course_status',
          target_type: 'course',
          target_id: course.id,
          detail: `${next === 'published' ? 'เผยแพร่' : 'เลิกเผยแพร่'}รายวิชา "${course.title}"`,
        },
      ]).then(() => {})
      fetchCourses()
    }
  }

  // ฟังก์ชันลบรายวิชา (ผ่าน ConfirmDialog)
  const performDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('courses').delete().eq('id', deleteTarget.id)
    if (error) {
      toast('เกิดข้อผิดพลาดในการลบวิชา: ' + error.message, 'error')
    } else {
      await supabase.from('activity_logs').insert([
        {
          user_id: user?.id ?? null,
          action: 'delete_course',
          target_type: 'course',
          target_id: deleteTarget.id,
          detail: `ลบรายวิชา "${deleteTarget.title}"`,
        },
      ]).then(() => {})
      fetchCourses()
    }
    setDeleteTarget(null)
    setDeleting(false)
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
              <Layers className="w-6 h-6 text-blue-600" /> จัดการรายวิชาและบทเรียน (Admin Dashboard)
            </h1>
            <p className="text-secondary text-sm">สร้างรายวิชา จัดการบทเรียนสั้น และคลังข้อสอบ Pre/Post-test</p>
          </div>

          <div className="flex items-center gap-3">
            {/* ปุ่มเข้าสู่หน้า Analytics (Step 7) */}
            <Link
              href="/dashboard/admin/reports"
              className="flex items-center gap-2 bg-white hover:bg-surface text-ink border border-border font-medium px-4 py-2.5 rounded-xl text-sm transition shadow-sm"
            >
              <BarChart3 className="w-4 h-4 text-blue-600" />
              ดูรายงาน Analytics
            </Link>

            {/* ปุ่มเปิด Modal สร้างวิชาใหม่ */}
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-ink font-medium px-4 py-2.5 rounded-xl text-sm transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              สร้างวิชาใหม่
            </button>
          </div>
        </div>

        {/* MODAL: ฟอร์มเพิ่มวิชาใหม่ */}
        <Modal open={isCreating} onClose={() => setIsCreating(false)} title="เพิ่มรายวิชาใหม่">
          <form onSubmit={handleCreateCourse} className="space-y-4">
            <div>
              <label htmlFor="course-title-create" className="block text-xs font-semibold text-ink mb-1">ชื่อรายวิชา *</label>
              <input
                id="course-title-create"
                type="text"
                required
                placeholder="เช่น วิทยาการคำนวณ ม.1"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-white border border-border rounded-lg p-2.5 text-sm text-ink focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="course-desc-create" className="block text-xs font-semibold text-ink mb-1">คำอธิบายรายวิชาสังเขป</label>
              <textarea
                id="course-desc-create"
                rows={3}
                placeholder="รายละเอียดเกี่ยวกับวิชานี้..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full bg-white border border-border rounded-lg p-2.5 text-sm text-ink focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 rounded-lg text-sm bg-surface hover:bg-surface text-secondary transition"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg text-sm bg-primary hover:bg-primary-dark text-ink font-medium transition disabled:opacity-50"
              >
                {submitting ? 'กำลังบันทึก...' : 'บันทึกสร้างวิชา'}
              </button>
            </div>
          </form>
        </Modal>

        {/* MODAL: แก้ไขรายวิชา */}
        <Modal open={!!editingCourse} onClose={() => setEditingCourse(null)} title="แก้ไขรายวิชา">
          <form onSubmit={handleEditCourse} className="space-y-4">
            <div>
              <label htmlFor="course-title-edit" className="block text-xs font-semibold text-ink mb-1">ชื่อรายวิชา *</label>
              <input
                id="course-title-edit"
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-white border border-border rounded-lg p-2.5 text-sm text-ink focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="course-desc-edit" className="block text-xs font-semibold text-ink mb-1">คำอธิบายรายวิชาสังเขป</label>
              <textarea
                id="course-desc-edit"
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full bg-white border border-border rounded-lg p-2.5 text-sm text-ink focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingCourse(null)}
                className="px-4 py-2 rounded-lg text-sm bg-surface hover:bg-surface text-secondary transition"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={editing}
                className="px-4 py-2 rounded-lg text-sm bg-primary hover:bg-primary-dark text-ink font-medium transition disabled:opacity-50"
              >
                {editing ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Confirm Delete Dialog */}
        <ConfirmDialog
          open={!!deleteTarget}
          title="ยืนยันการลบรายวิชา"
          tone="danger"
          loading={deleting}
          confirmText="ลบรายวิชา"
          message={
            <>
              ต้องการลบรายวิชา{' '}
              <span className="font-semibold text-rose-600">"{deleteTarget?.title}"</span> ใช่หรือไม่?
              <br />
              บทเรียนและข้อสอบทั้งหมดในวิชานี้จะถูกลบออกด้วย (ไม่สามารถกู้คืนได้)
            </>
          }
          onConfirm={performDelete}
          onCancel={() => setDeleteTarget(null)}
        />

        {/* SECTION: รายการคอร์สเรียนทั้งหมด */}
        {courses.length === 0 ? (
          <div className="bg-white border border-border rounded-2xl p-12 text-center space-y-3">
            <p className="text-secondary">ยังไม่มีรายวิชาในระบบ</p>
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-ink text-sm font-medium px-4 py-2 rounded-lg transition"
            >
              <Plus className="w-4 h-4" /> เริ่มต้นสร้างรายวิชาแรก
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white border border-border rounded-2xl p-6 flex flex-col justify-between hover:border-primary-dark/50 transition shadow-sm group"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
                        รายวิชา
                      </span>
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border ${
                        course.status === 'draft'
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                      }`}>
                        {course.status === 'draft' ? 'ฉบับร่าง' : 'เผยแพร่แล้ว'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => togglePublish(course)}
                        className="text-secondary hover:text-blue-600 p-1 transition opacity-0 group-hover:opacity-100"
                        title={course.status === 'draft' ? 'เผยแพร่รายวิชา' : 'เลิกเผยแพร่ (เก็บเป็นฉบับร่าง)'}
                      >
                        {course.status === 'draft' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => openEdit(course)}
                        className="text-secondary hover:text-blue-600 p-1 transition opacity-0 group-hover:opacity-100"
                        title="แก้ไขรายวิชา"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ id: course.id, title: course.title })}
                        className="text-secondary hover:text-rose-600 p-1 transition opacity-0 group-hover:opacity-100"
                        title="ลบรายวิชานี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-ink group-hover:text-blue-600 transition">
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
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-emerald-600" /> {course.enrollments_count} คนเรียน
                    </span>
                  </div>
                </div>

                {/* ปุ่มจัดการเนื้อหาภายในวิชา */}
                <div className="grid grid-cols-2 gap-2 pt-6">
                  <Link
                    href={`/dashboard/admin/courses/${course.id}/lessons`}
                    className="flex items-center justify-center gap-1.5 bg-surface hover:bg-surface text-ink border border-border text-xs font-medium py-2 rounded-lg transition"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> จัดการบทเรียน
                  </Link>

                  <Link
                    href={`/dashboard/admin/courses/${course.id}/questions`}
                    className="flex items-center justify-center gap-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-700 border border-blue-500/30 text-xs font-medium py-2 rounded-lg transition"
                  >
                    <HelpCircle className="w-3.5 h-3.5" /> จัดการข้อสอบ
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}