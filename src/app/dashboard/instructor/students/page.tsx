'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Download } from 'lucide-react'
import Skeleton from '@/components/ui/Skeleton'
import { csvCell, downloadCsv } from '@/lib/csv'

interface CourseRow {
  id: string
  title: string
}

interface RosterRow {
  enrollment_id: number
  user_id: string
  course_id: string
  status: string | null
  enrolled_at: string | null
  profiles?: { fullname: string; email: string } | null
  courses?: { title: string } | null
}

// REST คืน join เป็น object หรือ array ว่างได้ ให้ normalize เป็น object เสมอ
function relOne<T>(v: T[] | T | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null
  return v ?? null
}

function studentName(r: RosterRow): string {
  const p = relOne(r.profiles)
  return p?.fullname?.trim() || 'ไม่ระบุชื่อ'
}

function studentEmail(r: RosterRow): string {
  const p = relOne(r.profiles)
  return p?.email || '-'
}

function courseTitle(r: RosterRow): string {
  const c = relOne(r.courses)
  return c?.title || 'ไม่ระบุวิชา'
}

export default function InstructorStudentsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<RosterRow[]>([])
  const [courses, setCourses] = useState<CourseRow[]>([])

  async function fetchRoster() {
    setLoading(true)
    setError(null)
    let fetchErrorMessage: string | null = null
    const mergeError = (msg: string) => {
      if (msg) fetchErrorMessage = fetchErrorMessage ? `${fetchErrorMessage} / ${msg}` : msg
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      setError(userError?.message || 'ไม่พบผู้ใช้งาน')
      setLoading(false)
      return
    }

    const { data: myCourses, error: courseError } = await supabase
      .from('courses')
      .select('id, title')
      .eq('created_by', user.id)
    if (courseError) {
      mergeError(courseError.message)
    }

    const courseList = (myCourses ?? []) as CourseRow[]
    setCourses(courseList)

    if (courseList.length > 0) {
      const ids = courseList.map((c) => c.id)
      const { data, error: enrollError } = await supabase
        .from('enrollments')
        .select('enrollment_id, user_id, course_id, status, enrolled_at, profiles(fullname, email), courses(title)')
        .in('course_id', ids)
        .order('enrollment_id', { ascending: true })

      if (enrollError) {
        mergeError(enrollError.message)
      } else if (data) {
        setRows(data as unknown as RosterRow[])
      }
    } else {
      setRows([])
    }

    setError(fetchErrorMessage)
    setLoading(false)
  }

  useEffect(() => {
    const t = setTimeout(() => {
      fetchRoster()
    }, 0)
    return () => clearTimeout(t)
  }, [])

  const [courseFilter, setCourseFilter] = useState<string>('all')
  const filtered = useMemo(
    () => rows.filter((r) => courseFilter === 'all' || r.course_id === courseFilter),
    [rows, courseFilter],
  )
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => {
      const tc = courseTitle(a).localeCompare(courseTitle(b), 'th')
      if (tc !== 0) return tc
      return studentName(a).localeCompare(studentName(b), 'th')
    }),
    [filtered],
  )

  const distinctStudents = useMemo(() => new Set(filtered.map((r) => r.user_id)).size, [filtered])
  const activeCount = useMemo(() => filtered.filter((r) => r.status === 'active').length, [filtered])
  const completedCount = useMemo(() => filtered.filter((r) => r.status === 'completed').length, [filtered])

  const exportCsv = () => {
    const lines: string[] = []
    lines.push('ชื่อ,อีเมล,รายวิชา,สถานะ,วันที่ลงทะเบียน')
    sorted.forEach((r) => {
      const status = r.status === 'completed' ? 'เรียนจบแล้ว' : r.status === 'active' ? 'กำลังเรียนอยู่' : r.status || 'ไม่ระบุสถานะ'
      lines.push(
        [
          csvCell(studentName(r)),
          csvCell(studentEmail(r)),
          csvCell(courseTitle(r)),
          csvCell(status),
          csvCell(r.enrolled_at ? new Date(r.enrolled_at).toLocaleDateString('th-TH') : '-'),
        ].join(','),
      )
    })
    downloadCsv('instructor-students.csv', lines)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-8 w-80" />
          <Skeleton className="h-4 w-64" />
          <div className="space-y-3">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        <div className="border-b border-border pb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
              <Users className="w-6 h-6 text-purple-600" /> นักเรียนในรายวิชาของฉัน
            </h1>
            <p className="text-secondary text-xs mt-1">รายชื่อผู้เรียนที่ลงทะเบียนในรายวิชาที่คุณเป็นผู้สอน ({courses.length} รายวิชา)</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              aria-label="กรองตามรายวิชา"
              className="bg-white border border-border rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-purple-500"
            >
              <option value="all">ทุกรายวิชา</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            {sorted.length > 0 && (
              <button
                onClick={exportCsv}
                className="inline-flex items-center gap-2 bg-white hover:bg-surface border border-border text-sm font-medium px-4 py-2 rounded-lg transition"
              >
                <Download className="w-4 h-4" />
                ส่งออก CSV
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white border border-border rounded-xl p-4">
            <p className="text-xs text-secondary">ผู้เรียน (ไม่นับซ้ำ)</p>
            <p className="text-2xl font-bold text-ink">{distinctStudents} คน</p>
          </div>
          <div className="bg-white border border-border rounded-xl p-4">
            <p className="text-xs text-secondary">กำลังเรียนอยู่ (active)</p>
            <p className="text-2xl font-bold text-amber-600">{activeCount} รายการ</p>
          </div>
          <div className="bg-white border border-border rounded-xl p-4">
            <p className="text-xs text-secondary">เรียนจบแล้ว (completed)</p>
            <p className="text-2xl font-bold text-emerald-600">{completedCount} รายการ</p>
          </div>
        </div>

        {error ? (
          <div role="alert" className="bg-red-500/10 border border-red-500/20 text-red-600 p-4 rounded-xl text-sm">
            เกิดข้อผิดพลาดในการโหลดรายชื่อนักเรียน: {error}
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white border border-border rounded-2xl p-12 text-center text-secondary">
            ยังไม่มีรายวิชาที่คุณสร้าง สร้างรายวิชาจากเมนู &quot;สร้างรายวิชา&quot; เพื่อเริ่มรับผู้เรียน
          </div>
        ) : sorted.length === 0 ? (
          <div className="bg-white border border-border rounded-2xl p-12 text-center text-secondary">
            ยังไม่มีนักเรียนลงทะเบียนในรายวิชาที่เลือก
          </div>
        ) : (
          <div className="bg-white border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-[640px] w-full text-sm">
                <thead className="bg-surface">
                  <tr>
                    <th className="p-4 text-left text-xs font-semibold text-ink">ชื่อ-นามสกุล</th>
                    <th className="p-4 text-left text-xs font-semibold text-ink">อีเมล</th>
                    <th className="p-4 text-left text-xs font-semibold text-ink">รายวิชา</th>
                    <th className="p-4 text-left text-xs font-semibold text-ink">สถานะ</th>
                    <th className="p-4 text-left text-xs font-semibold text-ink">วันที่ลงทะเบียน</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r) => (
                    <tr key={r.enrollment_id} className="border-t border-border hover:bg-surface transition">
                      <td className="p-4 text-ink font-medium">{studentName(r)}</td>
                      <td className="p-4 text-secondary">{studentEmail(r)}</td>
                      <td className="p-4 text-ink">{courseTitle(r)}</td>
                      <td className="p-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          r.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : r.status === 'active'
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                              : 'bg-surface text-secondary border-border'
                        }`}>
                          {r.status === 'completed' ? 'เรียนจบแล้ว' : r.status === 'active' ? 'กำลังเรียนอยู่' : r.status || 'ไม่ระบุสถานะ'}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-secondary">
                        {r.enrolled_at ? new Date(r.enrolled_at).toLocaleDateString('th-TH') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
