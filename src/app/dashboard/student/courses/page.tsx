'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Clock, PlayCircle, Search, GraduationCap } from 'lucide-react'
import Skeleton from '@/components/ui/Skeleton'

interface Course {
  id: string
  title: string
  description: string
  created_at: string
}

interface EnrollmentRow {
  status: string
  courses: Course
}
export default function StudentCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [enrollmentStatuses, setEnrollmentStatuses] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function fetchCourses() {
      // ดึงเฉพาะคอร์สที่ผู้เรียนลงทะเบียนแล้ว (active + completed)
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data, error } = await supabase
          .from('enrollments')
          .select('status, courses(*)')
          .eq('user_id', user.id)

        if (error) {
          setError(error.message)
        } else if (data) {
          const statusMap: Record<string, string> = {}
          const enrolledCourses = (data as unknown as EnrollmentRow[])
            .map((row) => {
              // courses(*) อาจเป็น object หรือ array (ตาม schema)
              const c = Array.isArray(row.courses) ? row.courses[0] : row.courses
              if (c) {
                statusMap[c.id] = row.status
                return c
              }
              return null
            })
            .filter((c): c is Course => c !== null)
          setCourses(enrolledCourses)
          setEnrollmentStatuses(statusMap)
        }
      }
      setLoading(false)
    }

    fetchCourses()
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 bg-white hover:bg-surface border border-border rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">รายวิชาของฉัน</h1>
              <p className="text-secondary text-sm">เลือกรายวิชาที่ต้องการทดสอบความรู้และวัดระดับทักษะ</p>
            </div>
          </div>

          <Link
            href="/dashboard/student/courses/browse"
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-ink text-sm font-medium px-4 py-2.5 rounded-xl transition shadow-md"
          >
            <Search className="w-4 h-4" /> ค้นหาลงทะเบียนคอร์สใหม่
          </Link>
        </div>

        {/* Course Cards Grid */}
        {error ? (
          <div role="alert" className="bg-red-500/10 border border-red-500/20 text-red-600 p-4 rounded-xl text-sm">
            เกิดข้อผิดพลาดในการโหลดรายวิชา: {error}
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white border border-border rounded-xl p-12 text-center space-y-4">
            <GraduationCap className="w-12 h-12 text-muted mx-auto" />
            <p className="text-secondary">คุณยังไม่ได้ลงทะเบียนเรียนในรายวิชาใด</p>
            <Link
              href="/dashboard/student/courses/browse"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-ink text-sm font-medium px-5 py-2.5 rounded-xl transition"
            >
              <Search className="w-4 h-4" /> ไปยังหน้ารวมคอร์สเพื่อลงทะเบียน
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {courses.map((course) => (
              <div key={course.id} className="bg-white border border-border rounded-xl p-6 flex flex-col justify-between hover:border-primary-dark/50 transition">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="p-3 bg-blue-500/10 text-blue-600 rounded-lg w-fit">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    {enrollmentStatuses[course.id] === 'completed' && (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        เรียนจบแล้ว
                      </span>
                    )}
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
                  <Link
                    href={`/dashboard/student/courses/${course.id}`}
                    className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-ink text-sm font-medium px-4 py-2 rounded-lg transition"
                  >
                    <PlayCircle className="w-4 h-4" /> เข้าสู่คอร์สเรียน
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
