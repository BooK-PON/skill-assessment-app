'use client'

import './animations.css'

import { ArrowRight, BookOpen, ChartColumn, ClipboardCheck, Sparkles, Users } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

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

export default function LandingFeatures() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  // Scroll-reveal เมื่อ section เข้าสู่ viewport (เล่นครั้งเดียว)
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setIsVisible(true)
            obs.disconnect()
          }
        })
      },
      { threshold: 0.15 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <section
      id="features"
      ref={sectionRef}
      className={`landing-features relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 ${isVisible ? 'is-visible' : ''}`}
    >
      {/* Decorative soft blobs */}
      <div className="pointer-events-none absolute left-[-120px] top-10 -z-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 right-[-80px] -z-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-2xl" />

      <div className="mx-auto max-w-2xl text-center">
        <div className="landing-features-item reveal inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-secondary shadow-sm sm:text-sm">
          <Sparkles className="h-3.5 w-3.5 text-primary-dark" />
          ทำไมต้อง E-Learning Hub
        </div>
        <h2 className="landing-features-item reveal mt-5 text-balance text-3xl font-extrabold tracking-tight text-ink sm:text-4xl md:text-5xl">
          ครบทุกสิ่งที่คุณต้องการ
          <br className="hidden sm:block" />
          <span className="text-primary-dark">สำหรับการเรียนรู้ออนไลน์</span>
        </h2>
        <p className="landing-features-item reveal mt-4 text-pretty text-base text-secondary sm:text-lg">
          ตั้งแต่สร้างหลักสูตร จัดการบทเรียน ไปจนถึงวัดผลทักษะและวิเคราะห์ข้อมูลการเรียนรู้
        </p>
      </div>

      <div className="mt-12 grid gap-5 sm:mt-16 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f, i) => (
          <div
            key={f.title}
            data-order={i + 1}
            className="landing-features-item reveal group relative flex flex-col gap-4 rounded-2xl border border-border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-lg"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light text-primary-dark ring-1 ring-primary/20 transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-ink">
              <f.icon className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-ink">{f.title}</h3>
              <p className="text-sm leading-relaxed text-secondary">{f.desc}</p>
            </div>
            <div className="mt-auto flex items-center gap-1 text-sm font-semibold text-primary-dark opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              ดูเพิ่มเติม
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        ))}
      </div>

      <div className="landing-features-item reveal mt-12 text-center" data-order="5">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#1f1f1f] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:text-base"
        >
          เริ่มต้นใช้งานฟรี
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  )
}