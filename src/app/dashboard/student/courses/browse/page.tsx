'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import Link from 'next/link'
import { Search, BookOpen, Clock, CheckCircle, ArrowLeft } from 'lucide-react'
import Skeleton from '@/components/ui/Skeleton'
import { capacityLabel, capacityOf, fullCourseMessage, isCourseFull } from '@/lib/capacity'

interface Course {
  id: string
  title: string
  description: string
  created_at: string
  active_count?: number
  capacity?: number
}

export default function BrowseCoursesPage() {
  const { toast } = useToast()
  const [courses, setCourses] = useState<Course[]>([])
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [enrollingId, setEnrollingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function fetchAll() {
      setError(null)
      const [{ data: { user } }, { data: courseData, error: courseError }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('courses').select('*').eq('status', 'published').order('created_at', { ascending: false }),
      ])

      if (courseError) {
        setError(courseError.message)
      } else if (courseData) {
        setCourses(courseData)

        if (user) {
          // ดึงคอร์สที่ลงทะเบียนแล้ว
          const { data: enrolled, error: enrolledError } = await supabase
            .from('enrollments')
            .select('course_id')
            .eq('user_id', user.id)

          if (enrolledError) {
            setError(enrolledError.message)
          } else if (enrolled) {
            setEnrolledIds(new Set(enrolled.map((e) => e.course_id)))
          }
        }
      }
      setLoading(false)
    }

    fetchAll()
  }, [])

  // ฟังก์ชันลงทะเบียนคอร์ส (เปิดบทบาท)
  const handleEnroll = async (courseId: string) => {
    setEnrollingId(courseId)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast('กรุณาเข้าสู่ระบบก่อนลงทะเบียน', 'info')
      setEnrollingId(null)
      return
    }

    const course = courses.find((c) => c.id === courseId)
    const cap = capacityOf(course)
    if (isCourseFull(course?.active_count ?? 0, cap) && !enrolledIds.has(courseId)) {
      toast(fullCourseMessage(cap), 'warning')
      setEnrollingId(null)
      return
    }

    // UPSERT: ถ้ามีอยู่แล้วให้เปิดใช้งานใหม่ (re-enroll)
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
      setEnrolledIds(prev => new Set(prev).add(courseId))
      // ดึงจำนวนที่นั่งล่าสุดกลับมา เพราะ trigger จะอัปเดตหลัง insert
      // ถ้าไม่ refetch การ์ดจะยังแสดงที่นั่งว่างตามค่าเก่า (เช่น 1/1 ทั้งที่เต็มแล้ว)
      const { data: updatedCourse } = await supabase
        .from('courses')
        .select('active_count')
        .eq('id', courseId)
        .single()
      if (updatedCourse) {
        const nextActive = updatedCourse.active_count ?? 0
        setCourses(prev => prev.map(c => (c.id === courseId ? { ...c, active_count: nextActive } : c)))
      }
    }
    setEnrollingId(null)
  }

  const filteredCourses = courses.filter((c) =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
          <Skeleton className="h-12 rounded-xl" />
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4 border-b border-border pb-4">
          <Link href="/dashboard/student/courses" className="p-2 bg-white hover:bg-surface border border-border rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">ค้นหารายวิชาเพื่อลงทะเบียน</h1>
            <p className="text-secondary text-sm">เลือกรายวิชาที่ต้องการเรียนแล้วกดปุ่มลงทะเบียน</p>
          </div>
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-2 bg-white border border-border rounded-xl px-4 py-3">
          <Search className="w-5 h-5 text-secondary" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาชื่อวิชา หรือคำอธิบาย..."
            className="w-full bg-transparent text-sm text-ink focus:outline-none placeholder:text-muted"
          />
        </div>

        {/* Courses Grid */}
        {error ? (
          <div role="alert" className="bg-red-500/10 border border-red-500/20 text-red-600 p-4 rounded-xl text-sm">
            เกิดข้อผิดพลาดในการโหลดรายวิชา: {error}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="bg-white border border-border rounded-xl p-12 text-center text-secondary">
            ไม่พบรายวิชาในระบบ
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {filteredCourses.map((course) => {
              const isEnrolled = enrolledIds.has(course.id)
              const cap = capacityOf(course)
              const isFull = isCourseFull(course.active_count ?? 0, cap)
              return (
                <div key={course.id} className="bg-white border border-border rounded-xl p-6 flex flex-col justify-between hover:border-primary-dark/50 transition">
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-500/10 text-blue-600 rounded-lg w-fit">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold">{course.title}</h2>
                    <p className="text-secondary text-sm line-clamp-2">
                      {course.description || 'ไม่มีคำอธิบายเพิ่มเติม'}
                    </p>
                  </div>

                  <div className="pt-6 border-t border-border mt-4 flex items-center justify-between">
                    <span className="text-xs text-secondary flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(course.created_at).toLocaleDateString('th-TH')}
                    </span>

                    {isEnrolled ? (
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                          <CheckCircle className="w-4 h-4" /> ลงทะเบียนแล้ว
                        </span>
                        <Link
                          href={`/dashboard/student/courses/${course.id}`}
                          className="text-xs bg-primary hover:bg-primary-dark text-ink font-medium px-3 py-1.5 rounded-lg transition"
                        >
                          เข้าสู่คอร์ส
                        </Link>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`text-[11px] font-medium ${isFull ? 'text-rose-600' : 'text-secondary'}`}>
                          {capacityLabel(course.active_count ?? 0, cap)}
                        </span>
                        <button
                          onClick={() => handleEnroll(course.id)}
                          disabled={enrollingId === course.id || isFull}
                          className="bg-primary hover:bg-primary-dark text-ink text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
                        >
                          {enrollingId === course.id ? 'กำลังลงทะเบียน...' : isFull ? 'เต็มแล้ว' : 'ลงทะเบียนเรียน'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
