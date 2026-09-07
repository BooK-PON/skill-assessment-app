'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LogOut, GraduationCap, BookOpen, Users, BarChart3, Layers, History, Smile, TrendingUp, PlusCircle, Menu, X } from 'lucide-react'
import { ToastProvider } from '@/components/ui/Toast'
import Button from '@/components/ui/Button'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<{ fullname?: string; role: string } | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('fullname, role')
          .eq('id', user.id)
          .single()

        if (data) setProfile(data)
      }
    }
    getProfile()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // แปลง Role เป็นป้ายภาษาไทย
  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return { label: 'ผู้ดูแลระบบ (Admin)', color: 'bg-rose-500/10 text-rose-600 border-rose-500/30' }
      case 'instructor':
      case 'teacher':
        return { label: 'ผู้สอน (Instructor)', color: 'bg-purple-500/10 text-purple-600 border-purple-500/30' }
      default:
        return { label: 'ผู้เรียน (Student)', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' }
    }
  }

  const roleInfo = getRoleBadge(profile?.role)

  const navLink = (href: string, active: boolean) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
      active
        ? 'bg-primary-light text-primary-dark border border-primary/30'
        : 'text-secondary hover:text-ink hover:bg-surface'
    }`

  const isRole = (roles: string[]) => profile?.role && roles.includes(profile.role)

  const adminNav = (
    <>
      <Link href="/dashboard/admin/courses" className={navLink('/dashboard/admin/courses', pathname.startsWith('/dashboard/admin/courses'))} onClick={() => setMobileOpen(false)}>
        <Layers className="w-4 h-4" /> รายวิชา
      </Link>
      <Link href="/dashboard/admin/enrollments" className={navLink('/dashboard/admin/enrollments', pathname.startsWith('/dashboard/admin/enrollments'))} onClick={() => setMobileOpen(false)}>
        <BookOpen className="w-4 h-4" /> การลงทะเบียน
      </Link>
      <Link href="/dashboard/admin/reports" className={navLink('/dashboard/admin/reports', pathname.startsWith('/dashboard/admin/reports'))} onClick={() => setMobileOpen(false)}>
        <BarChart3 className="w-4 h-4" /> รายงาน
      </Link>
      <Link href="/dashboard/admin/satisfaction" className={navLink('/dashboard/admin/satisfaction', pathname.startsWith('/dashboard/admin/satisfaction'))} onClick={() => setMobileOpen(false)}>
        <Smile className="w-4 h-4" /> ความพึงพอใจ
      </Link>
      <Link href="/dashboard/admin/users" className={navLink('/dashboard/admin/users', pathname.startsWith('/dashboard/admin/users'))} onClick={() => setMobileOpen(false)}>
        <Users className="w-4 h-4" /> ผู้ใช้งาน
      </Link>
      <Link href="/dashboard/admin/logs" className={navLink('/dashboard/admin/logs', pathname.startsWith('/dashboard/admin/logs'))} onClick={() => setMobileOpen(false)}>
        <History className="w-4 h-4" /> ประวัติการใช้งาน
      </Link>
      <Link href="/dashboard/instructor/courses" className={navLink('/dashboard/instructor/courses', pathname.startsWith('/dashboard/instructor/courses'))} onClick={() => setMobileOpen(false)}>
        <BookOpen className="w-4 h-4" /> ดูระบบผู้สอน
      </Link>
    </>
  )

  const instructorNav = (
    <>
      <Link href="/dashboard/instructor/courses" className={navLink('/dashboard/instructor/courses', pathname.startsWith('/dashboard/instructor/courses'))} onClick={() => setMobileOpen(false)}>
        <BookOpen className="w-4 h-4" /> จัดการรายวิชาและข้อสอบ
      </Link>
      <Link href="/dashboard/instructor/reports" className={navLink('/dashboard/instructor/reports', pathname.startsWith('/dashboard/instructor/reports'))} onClick={() => setMobileOpen(false)}>
        <BarChart3 className="w-4 h-4" /> รายงาน
      </Link>
      <Link href="/dashboard/instructor/create-course" className={navLink('/dashboard/instructor/create-course', pathname.startsWith('/dashboard/instructor/create-course'))} onClick={() => setMobileOpen(false)}>
        <PlusCircle className="w-4 h-4" /> สร้างรายวิชา
      </Link>
    </>
  )

  const studentNav = (
    <>
      <Link href="/dashboard/student/courses" className={navLink('/dashboard/student/courses', pathname.startsWith('/dashboard/student/courses'))} onClick={() => setMobileOpen(false)}>
        <BookOpen className="w-4 h-4" /> วิชาเรียนของฉัน
      </Link>
      <Link href="/dashboard/student/progress" className={navLink('/dashboard/student/progress', pathname.startsWith('/dashboard/student/progress'))} onClick={() => setMobileOpen(false)}>
        <TrendingUp className="w-4 h-4" /> ความก้าวหน้า
      </Link>
    </>
  )

  const renderNav = () => {
    if (isRole(['admin'])) return adminNav
    if (isRole(['instructor', 'teacher'])) return instructorNav
    if (isRole(['student'])) return studentNav
    return null
  }

  return (
    <div className="min-h-screen bg-surface text-ink flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">

          {/* Logo & Dynamic Role Nav */}
          <div className="flex items-center gap-6 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <div className="p-2 bg-primary-light text-primary-dark rounded-xl border border-primary/30">
                <GraduationCap className="w-5 h-5" />
              </div>
              <Link href="/dashboard" className="font-bold text-ink text-base tracking-wide">
                E-Learning Hub
              </Link>
            </div>

            {/* เมนูเฉพาะตาม Role (desktop) */}
            <nav className="hidden md:flex items-center gap-2 border-l border-border pl-4 text-xs min-w-0">
              {renderNav()}
            </nav>
          </div>

          {/* User Profile Info */}
          <div className="flex items-center gap-4 min-w-0">
            {profile && (
              <div className="hidden sm:flex items-center gap-2 text-xs min-w-0">
                <span className={`hidden lg:inline-block px-2.5 py-1 rounded-full border font-medium ${roleInfo.color}`}>
                  {roleInfo.label}
                </span>
                <span className="text-ink font-semibold truncate max-w-[160px] sm:max-w-[240px]">
                  {profile.fullname || 'ผู้ใช้งาน'}
                </span>
              </div>
            )}

            <Button
              variant="secondary"
              onClick={handleSignOut}
              className="hidden sm:inline-flex text-xs px-3 py-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">ออกจากระบบ</span>
            </Button>

            {/* Hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-secondary hover:text-ink hover:bg-surface transition"
              aria-label={mobileOpen ? 'ปิดเมนู' : 'เปิดเมนู'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-white">
            <div className="max-w-7xl mx-auto px-4 py-3 space-y-1">
              {profile && (
                <div className="flex items-center gap-2 px-3 py-2 text-xs">
                  <span className={`px-2.5 py-1 rounded-full border font-medium ${roleInfo.color}`}>
                    {roleInfo.label}
                  </span>
                  <span className="text-ink font-semibold truncate">
                    {profile.fullname || 'ผู้ใช้งาน'}
                  </span>
                </div>
              )}
              {renderNav()}
              <div className="pt-2 border-t border-border">
                <Button
                  variant="secondary"
                  onClick={handleSignOut}
                  className="w-full"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  ออกจากระบบ
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        <ToastProvider>
          {children}
        </ToastProvider>
      </main>
    </div>
  )
}