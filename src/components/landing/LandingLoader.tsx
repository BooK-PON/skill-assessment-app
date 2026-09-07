"use client";

import { useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";

const FILL_DURATION = 1300;
const OUT_DURATION = 700;

type Phase = "filling" | "leaving" | "hidden";

export default function LandingLoader({ onReady }: { onReady: () => void }) {
  const [phase, setPhase] = useState<Phase>("filling");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const html = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let outTimer: number | undefined;
    let disposed = false;

    if (reduceMotion) {
      onReady();
      html.classList.remove("no-scroll");
      window.setTimeout(() => setPhase("hidden"), 0);
      return () => html.classList.remove("no-scroll");
    }

    html.classList.add("no-scroll");
    const start = performance.now();

    const finishFill = () => {
      if (disposed) return;
      setProgress(100);
      setPhase("leaving");
      onReady();
      outTimer = window.setTimeout(() => {
        html.classList.remove("no-scroll");
        setPhase("hidden");
      }, OUT_DURATION);
    };

    const tick = (now: number) => {
      if (disposed) return;
      const t = Math.min((now - start) / FILL_DURATION, 1);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      setProgress(Math.round(eased * 100));
      if (t >= 1) {
        finishFill();
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      if (outTimer) window.clearTimeout(outTimer);
      html.classList.remove("no-scroll");
    };
  }, [onReady]);

  if (phase === "hidden") return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0a0a0a] text-white transition-transform duration-[700ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
        phase === "leaving" ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-ink">
          <GraduationCap className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="text-left">
          <p className="text-sm font-semibold tracking-wide">E-Learning Hub</p>
          <p className="text-xs text-white/50">ระบบประเมินทักษะการเรียนรู้</p>
        </div>
      </div>

      <div className="mt-10 w-56">
        <div className="h-px w-full bg-white/15">
          <div className="h-px bg-primary" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <p className="mt-4 text-3xl font-semibold tabular-nums tracking-tight">
        {String(progress).padStart(3, "0")}
      </p>
    </div>
  );
}