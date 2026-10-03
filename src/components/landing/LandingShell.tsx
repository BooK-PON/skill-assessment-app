'use client'

import LandingHero from './LandingHero'
import LandingLoader from './LandingLoader'
import { useState } from 'react'

export default function LandingShell({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  return (
    <>
      <LandingLoader onReady={() => setReady(true)} />
      <LandingHero isReady={ready} />
      {children}
    </>
  )
}