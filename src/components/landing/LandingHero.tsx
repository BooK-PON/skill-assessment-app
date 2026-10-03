import './animations.css'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function LandingHero({ isReady }: { isReady: boolean }) {
  const [time, setTime] = useState<string>('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTime(
        new Intl.DateTimeFormat('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(now),
      )
    }
    updateTime()
    const id = setInterval(updateTime, 60_000)
    return () => clearInterval(id)
  }, [])

  // Trigger reveal when ready
  useEffect(() => {
    if (!isReady) return
    const el = document.querySelectorAll<HTMLElement>('.landing-hero .reveal')
    const raf = requestAnimationFrame(() => {
      el.forEach((e) => e.classList.add('is-ready'))
    })
    return () => cancelAnimationFrame(raf)
  }, [isReady])

  const scrollToFeatures = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    const target = document.getElementById('features')
    target?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="landing-hero relative flex min-h-[calc(100dvh-0px)] items-center justify-center overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[40vh] bg-[radial-gradient(1200px_600px_at_50%_0%,rgba(244,183,64,0.08),rgba(255,255,255,0))]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1400px_700px_at_50%_0%,rgba(255,255,255,1),rgba(250,250,248,1))]" />

      {/* Top Bar */}
      <header className="reveal absolute left-0 right-0 top-0 z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6" data-order="1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-light ring-1 ring-primary/20">
            <span className="text-base font-bold text-primary-dark">EH</span>
          </div>
          <span className="hidden text-sm font-semibold tracking-wide text-ink sm:block">E-LEARNING HUB</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {time && (
            <span className="hidden rounded-full border border-border bg-white/80 px-3 py-1 text-xs text-secondary shadow-sm backdrop-blur sm:inline-flex">
              {time}
            </span>
          )}
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm transition-colors hover:border-primary-dark/40 hover:bg-surface sm:px-4"
          >
            เข้าสู่ระบบ
          </Link>
        </div>
      </header>

      {/* Hero Content */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center px-4 text-center sm:px-6">
        <div className="reveal mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-secondary shadow-sm sm:text-sm" data-order="2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          แพลตฟอร์มการเรียนรู้ออนไลน์
        </div>

        <h1 className="reveal text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl md:text-6xl lg:text-7xl" data-order="3">
          เรียนรู้ได้ทุกที่
          <br className="hidden sm:block" />
          ด้วย <span className="text-primary-dark">E-Learning Hub</span>
        </h1>

        <p className="reveal mt-5 max-w-2xl text-pretty text-base text-secondary sm:mt-6 sm:text-lg md:text-xl" data-order="4">
          ระบบจัดการหลักสูตร • แบบทดสอบ Pre/Post • วิเคราะห์ทักษะ 5 ด้าน • แบบประเมินความพึงพอใจ
        </p>

        <div className="reveal mt-8 flex flex-wrap items-center justify-center gap-3 sm:mt-10 sm:gap-4" data-order="5">
          <Link
            href="/login"
            className="group inline-flex items-center gap-2 rounded-full bg-[#111111] px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#1f1f1f] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:px-6 sm:py-3 sm:text-base"
          >
            เริ่มต้นใช้งาน
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 sm:h-5 sm:w-5" />
          </Link>
          <button
            onClick={scrollToFeatures}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-5 py-3 text-sm font-semibold text-ink shadow-sm transition-colors hover:border-primary-dark/40 hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:px-6 sm:py-3 sm:text-base"
          >
            ดูคุณสมบัติ
          </button>
        </div>

        <div className="reveal pointer-events-none absolute inset-x-0 bottom-0 hidden select-none items-end justify-center overflow-hidden lg:flex" data-order="6">
          <span className="translate-y-2 text-[clamp(120px,16vw,240px)] font-black uppercase tracking-[0.08em] text-primary/10">
            E-LEARNING HUB
          </span>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
    </section>
  )
}