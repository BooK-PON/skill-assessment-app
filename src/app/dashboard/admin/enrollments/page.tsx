'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, Users, CheckCircle2, Clock, TriangleAlert } from 'lucide-react'
import Skeleton from '@/components/ui/Skeleton'

interface EnrollmentRow {
  enrollment_id: string
  user_id: string
  course_id: string
  status: string
  enrolled_at: string
  profiles?: { fullname?: string; email?: string }
  courses?: { title?: string }
}

export default function AdminEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, profiles(fullname, email), courses(title)')
        .order('enrolled_at', { ascending: false })

      if (error) {
        setError('ไม่สามารถดึงข้อมูลการลงทะเบียนได้: ' + error.message)
      } else if (data) {
        setEnrollments(data as unknown as EnrollmentRow[])
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const filtered = enrollments.filter((e) => filter === 'all' || e.status === filter)

  const countByStatus = (s: string) => enrollments.filter((e) => e.status === s).length

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-8 w-80" />
          <Skeleton className="h-4 w-96" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Title */}
        <div className="border-b border-border pb-4">
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-rose-500" /> การลงทะเบียนเรียนทั้งหมด
          </h1>
          <p className="text-secondary text-sm mt-1">ติดตามสถิติการลงทะเบียนเรียนของผู้เรียนในแต่ละรายวิชา</p>
        </div>

        {error && (
          <div role="alert" className="bg-rose-500/10 border border-rose-500/50 rounded-lg p-3 text-sm text-rose-600">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-border p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-secondary">การลงทะเบียนทั้งหมด</p>
              <p className="text-2xl font-bold text-blue-600">{enrollments.length} รายการ</p>
            </div>
            <Users className="w-8 h-8 text-blue-600/30" />
          </div>
          <div className="bg-white border border-border p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-secondary">อยู่ระหว่างเรียน</p>
              <p className="text-2xl font-bold text-amber-600">{countByStatus('active')} รายการ</p>
            </div>
            <Clock className="w-8 h-8 text-amber-600/30" />
          </div>
          <div className="bg-white border border-border p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-secondary">เรียนจบแล้ว</p>
              <p className="text-2xl font-bold text-emerald-600">{countByStatus('completed')} รายการ</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-emerald-600/30" />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2">
          {(['all', 'active', 'completed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition border ${
                filter === s
                  ? 'bg-rose-600/20 text-rose-600 border-rose-500/30'
                  : 'bg-white text-secondary border-border hover:text-ink'
              }`}
            >
              {s === 'all' ? 'ทั้งหมด' : s === 'active' ? 'อยู่ระหว่างเรียน' : 'เรียนจบแล้ว'}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-secondary flex items-center justify-center gap-2">
              <TriangleAlert className="w-5 h-5" /> ไม่มีข้อมูลการลงทะเบียน
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-ink min-w-[640px]">
              <thead className="bg-surface text-secondary text-xs uppercase border-b border-border">
                <tr>
                  <th className="p-4">ผู้เรียน</th>
                  <th className="p-4">รายวิชา</th>
                  <th className="p-4">สถานะ</th>
                  <th className="p-4">วันที่ลงทะเบียน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((e) => {
                  const name = e.profiles?.fullname || e.profiles?.email || 'ไม่ระบุชื่อ'
                  return (
                    <tr key={e.enrollment_id} className="hover:bg-surface transition">
                      <td className="p-4 font-medium text-ink">{name}</td>
                      <td className="p-4 text-ink">{e.courses?.title || 'ไม่ระบุวิชา'}</td>
                      <td className="p-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          e.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : e.status === 'active'
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            : 'bg-surface text-secondary border-border'
                        }`}>
                          {e.status === 'completed' ? 'เรียนจบแล้ว' : e.status === 'active' ? 'อยู่ระหว่างเรียน' : e.status || 'ไม่ระบุ'}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-secondary">
                        {e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString('th-TH') : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          )}
        </div>

      </div>
    </div>
  )
}
