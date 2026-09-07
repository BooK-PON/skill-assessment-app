"use client";

import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import LandingLoader from "./LandingLoader";
import LandingHero from "./LandingHero";

export default function LandingShell({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);

  return (
    <div className="landing-shell flex min-h-screen flex-col bg-white text-ink">
      <LandingLoader onReady={handleReady} />
      <LandingHero ready={ready} />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}