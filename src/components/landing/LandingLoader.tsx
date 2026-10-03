import './animations.css'

import { useEffect, useState } from 'react'

export default function LandingLoader({ onReady }: { onReady?: () => void }) {
  const [isExiting, setIsExiting] = useState(false)
  const [isDone, setIsDone] = useState(false)

  useEffect(() => {
    // Lock scroll during loader
    const html = document.documentElement
    html.classList.add('no-scroll')

    const t1 = setTimeout(() => {
      setIsExiting(true)
    }, 1300)

    const t2 = setTimeout(() => {
      setIsDone(true)
      html.classList.remove('no-scroll')
      onReady?.()
    }, 2000)

    // Respect reduced motion
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) {
      clearTimeout(t1)
      clearTimeout(t2)
      setIsExiting(true)
      setIsDone(true)
      html.classList.remove('no-scroll')
      onReady?.()
    }

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      html.classList.remove('no-scroll')
    }
  }, [onReady])

  if (isDone) return null

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-[#000000] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
        isExiting ? 'translate-y-full' : 'translate-y-0'
      }`}
      aria-hidden="true"
    >
      <div className="flex flex-col items-center gap-6">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-primary" />
          <div className="absolute inset-0 -z-10 animate-pulse rounded-2xl bg-primary/20 blur-xl" />
        </div>
        <p className="text-sm tracking-[0.2em] text-white/70 uppercase">Loading E-Learning Hub</p>
      </div>
    </div>
  )
}