import LandingShell from '@/components/landing/LandingShell'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ArrowRight, BookOpen, ChartColumn, ClipboardCheck, Users } from 'lucide-react'
import Link from 'next/link'

const features = [
  {
    icon: BookOpen,
    title: 'จัดการหลักสูตร',
    desc: 'สร้างและจัดการบทเรียน วิดีโอ และไฟล์ PDF ได้อย่างง่าย',
  },
  {
    icon: ClipboardCheck,
    title: 'แบบทดสอบ Pre/Post',
    desc: 'วัดผลการเรียนรู้ก่อน-หลังเรียน พร้อมวิเคราะห์คะแนนรายข้อ',
  },
  {
    icon: ChartColumn,
    title: 'วิเคราะห์ทักษะ 5 ด้าน',
    desc: 'กราฟความก้าวหน้า Pre vs Post ช่วยระบุจุดอ่อนและแนะนำคอร์ส',
  },
  {
    icon: Users,
    title: 'ระบบสมาชิก 3 บทบาท',
    desc: 'แยกสิทธิ์ Admin • Teacher • Student ชัดเจนและปลอดภัย',
  },
]

export default async function HomePage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
      },
    },
  })
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    redirect('/dashboard')
  }
  return (
    <main className='min-h-screen bg-white'>
      <LandingShell>
        <section id='features' className='relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24'>
          ...
        </section>
      </LandingShell>
    </main>
  )
}
