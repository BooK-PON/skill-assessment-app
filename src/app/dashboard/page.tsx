'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { GraduationCap, BookOpen, Users, BarChart3, History, Layers, School, ArrowRight } from 'lucide-react'

interface StatCard {
  label: string
  value: string
  icon?: React.ReactNode
  color: string
  href?: string
}

export default function DashboardOverviewPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [role, setRole] = useState<string | null>(null)
  const [stats, setStats] = useState<StatCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError) {
        setError('ไม่สามารถโหลดข้อมูลผู้ใช้งาน: ' + profileError.message)
        setLoading(false)
        return
      }

      const r = profile?.role
      if (!r) {
        router.replace('/login')
        return
      }
      setRole(r)

      if (r === 'admin') {
        // สถิติสำหรับ Admin
        const [users, courses, enrollments] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('courses').select('id', { count: 'exact', head: true }),
          supabase.from('enrollments').select('enrollment_id', { count: 'exact', head: true }),
        ])
        const countError = users.error || courses.error || enrollments.error
        if (countError) {
          setError('เกิดข้อผิดพลาดในการโหลดสถิติ: ' + countError.message)
        }
        setStats([
          { label: 'ผู้ใช้งานทั้งหมด', value: String(users.count ?? 0), color: 'text-info', icon: <Users className="w-8 h-8 text-info/30" />, href: '/dashboard/admin/users' },
          { label: 'รายวิชาทั้งหมด', value: String(courses.count ?? 0), color: 'text-purple-600', icon: <BookOpen className="w-8 h-8 text-purple-400/30" />, href: '/dashboard/admin/courses' },
          { label: 'รายการลงทะเบียน', value: String(enrollments.count ?? 0), color: 'text-success', icon: <GraduationCap className="w-8 h-8 text-success/30" />, href: '/dashboard/admin/enrollments' },
        ])
      } else if (r === 'instructor' || r === 'teacher') {
        const { count: courses, error: coursesError } = await supabase
          .from('courses')
          .select('id', { count: 'exact', head: true })
          .eq('created_by', user.id)
        if (coursesError) {
          setError('เกิดข้อผิดพลาดในการโหลดสถิติ: ' + coursesError.message)
        }
        setStats([
          { label: 'รายวิชาที่จัดการ', value: String(courses ?? 0), color: 'text-purple-600', icon: <BookOpen className="w-8 h-8 text-purple-400/30" />, href: '/dashboard/instructor/courses' },
          { label: 'งานตรวจสอบคะแนน', value: 'ดูรายงาน', color: 'text-info', icon: <BarChart3 className="w-8 h-8 text-info/30" />, href: '/dashboard/instructor/reports' },
        ])
      } else {
        // Student
        const { data: enrollRows, error: enrollError } = await supabase
          .from('enrollments')
          .select('status')
          .eq('user_id', user.id)

        if (enrollError) {
          setError('เกิดข้อผิดพลาดในการโหลดข้อมูลการเรียน: ' + enrollError.message)
        }
        const active = (enrollRows || []).filter((e) => e.status === 'active').length
        const completed = (enrollRows || []).filter((e) => e.status === 'completed').length
        setStats([
          { label: 'คอร์สที่กำลังเรียน', value: String(active), color: 'text-info', icon: <BookOpen className="w-8 h-8 text-info/30" />, href: '/dashboard/student/courses' },
          { label: 'คอร์สที่เรียนจบ', value: String(completed), color: 'text-success', icon: <GraduationCap className="w-8 h-8 text-success/30" />, href: '/dashboard/student/courses' },
          { label: 'ค้นหาคอร์สใหม่', value: 'ค้นหา', color: 'text-purple-600', icon: <School className="w-8 h-8 text-purple-400/30" />, href: '/dashboard/student/courses/browse' },
        ])
      }
      setLoading(false)
    }
    load()
  }, [router])

  const roleCard = (title: string, desc: string, href: string, icon: React.ReactNode, color: string) => (
    <Link
      href={href}
      className="bg-white border border-border rounded-2xl p-6 shadow-sm hover:border-primary-dark/50 transition flex items-start justify-between group"
    >
      <div className="space-y-2">
        <div className={`p-3 rounded-xl w-fit ${color}`}>{icon}</div>
        <h3 className="font-bold text-ink">{title}</h3>
        <p className="text-secondary text-xs">{desc}</p>
      </div>
      <ArrowRight className="w-5 h-5 text-muted group-hover:text-primary-dark transition" />
    </Link>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="animate-pulse text-muted">กำลังโหลดแดชบอร์ด...</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        <div className="border-b border-border pb-4">
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary-dark" /> ภาพรวมระบบ E-Learning Hub
          </h1>
          <p className="text-secondary text-sm mt-1">
            {role === 'admin' ? 'แดชบอร์ดผู้ดูแลระบบ' : role === 'instructor' || role === 'teacher' ? 'แดชบอร์ดผู้สอน' : 'แดชบอร์ดผู้เรียน'}
          </p>
        </div>

        {error && (
          <div role="alert" className="bg-red-500/10 border border-red-500/20 text-red-600 p-4 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((s) => (
            s.href ? (
              <Link key={s.label} href={s.href} className="bg-white border border-border shadow-sm p-4 rounded-xl flex items-center justify-between hover:border-primary-dark/50 transition">
                <div>
                  <p className="text-xs text-secondary">{s.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </div>
                {s.icon}
              </Link>
            ) : (
              <div key={s.label} className="bg-white border border-border shadow-sm p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-secondary">{s.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </div>
                {s.icon}
              </div>
            )
          ))}
        </div>

        {/* Quick access menu */}
        <div className="grid md:grid-cols-2 gap-4 pt-2">
          {role === 'admin' && (
            <>
              {roleCard('จัดการรายวิชา', 'สร้าง แก้ไข ลบ และจัดสถานะการเผยแพร่รายวิชา', '/dashboard/admin/courses', <Layers className="w-6 h-6 text-info" />, 'bg-info/10 text-info')}
              {roleCard('การลงทะเบียนเรียน', 'ติดตามผู้เรียนและสถิติการลงทะเบียน', '/dashboard/admin/enrollments', <GraduationCap className="w-6 h-6 text-success" />, 'bg-success/10 text-success')}
              {roleCard('รายงานผลวิเคราะห์', 'ดูรายงานคะแนนวัดผลสัมฤทธิ์และความก้าวหน้า', '/dashboard/admin/reports', <BarChart3 className="w-6 h-6 text-purple-600" />, 'bg-purple-500/10 text-purple-600')}
              {roleCard('จัดการผู้ใช้งาน', 'ปรับเปลี่ยนสิทธิ์และบทบาทของผู้ใช้งาน', '/dashboard/admin/users', <Users className="w-6 h-6 text-danger" />, 'bg-danger/10 text-danger')}
              {roleCard('ประวัติการใช้งาน', 'ตรวจสอบบันทึกกิจกรรมสำคัญในระบบ', '/dashboard/admin/logs', <History className="w-6 h-6 text-warning" />, 'bg-warning/10 text-warning')}
              {roleCard('ระบบผู้สอน', 'เข้าใช้งานในมุมมองของผู้สอน', '/dashboard/instructor/courses', <School className="w-6 h-6 text-indigo-500" />, 'bg-indigo-500/10 text-indigo-500')}
            </>
          )}
          {role === 'instructor' || role === 'teacher' ? (
            <>
              {roleCard('จัดการรายวิชา', 'จัดการบทเรียน ข้อสอบ และเนื้อหาวิชา', '/dashboard/instructor/courses', <BookOpen className="w-6 h-6 text-purple-600" />, 'bg-purple-500/10 text-purple-600')}
              {roleCard('รายงานผลวิเคราะห์', 'ดูผลการวัดและประเมินผลของผู้เรียน', '/dashboard/instructor/reports', <BarChart3 className="w-6 h-6 text-info" />, 'bg-info/10 text-info')}
              {roleCard('สร้างรายวิชาใหม่', 'เริ่มต้นสร้างรายวิชาและแบบทดสอบใหม่', '/dashboard/instructor/create-course', <Layers className="w-6 h-6 text-success" />, 'bg-success/10 text-success')}
            </>
          ) : role === 'student' ? (
            <>
              {roleCard('วิชาเรียนของฉัน', 'เข้าเรียนและทำแบบทดสอบในคอร์สที่ลงทะเบียน', '/dashboard/student/courses', <BookOpen className="w-6 h-6 text-info" />, 'bg-info/10 text-info')}
              {roleCard('ค้นหาคอร์สใหม่', 'ค้นหาและลงทะเบียนเรียนคอร์สเพิ่มเติม', '/dashboard/student/courses/browse', <School className="w-6 h-6 text-purple-600" />, 'bg-purple-500/10 text-purple-600')}
            </>
          ) : null}
        </div>

      </div>
    </div>
  )
}