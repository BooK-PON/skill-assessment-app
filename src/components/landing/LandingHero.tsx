"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock3, GraduationCap } from "lucide-react";

function formatTime() {
  return new Date().toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function LandingHero({ ready }: { ready: boolean }) {
  const [time, setTime] = useState("");

  useEffect(() => {
    let interval: number | undefined;
    const timer = window.setTimeout(() => {
      setTime(formatTime());
      interval = window.setInterval(() => setTime(formatTime()), 1000);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      if (interval) window.clearInterval(interval);
    };
  }, []);

  const scrollToFeatures = () => {
    const el = document.getElementById("features");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const delay = (ms: number) => ({ "--reveal-delay": `${ms}ms` }) as CSSProperties;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-border/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-light text-primary-dark">
              <GraduationCap className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-base font-bold tracking-wide text-ink">E-Learning Hub</span>
          </Link>
          <nav className="flex items-center gap-5">
            <button
              type="button"
              onClick={scrollToFeatures}
              className="hidden text-sm font-medium text-secondary transition hover:text-ink sm:block"
            >
              ความสามารถของระบบ
            </button>
            <span
              className="hidden items-center gap-1.5 text-xs tabular-nums text-muted md:flex"
              aria-hidden="true"
            >
              <Clock3 className="h-3.5 w-3.5" />
              {time || "—"}
            </span>
            <Link
              href="/login"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-ink shadow-sm transition hover:bg-primary-dark"
            >
              เข้าสู่ระบบ
            </Link>
          </nav>
        </div>
      </header>

      <section
        id="hero"
        className={`landing-hero relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pb-20 pt-28 text-center ${
          ready ? "is-ready" : ""
        }`}
      >
        <span
          aria-hidden="true"
          className="reveal pointer-events-none absolute top-20 select-none text-[24vw] font-bold leading-none tracking-tight text-ink/5 md:text-[14vw] lg:whitespace-nowrap"
          style={delay(0)}
        >
          E-LEARNING HUB
        </span>

        <span
          className="reveal inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary-light px-3.5 py-1 text-xs font-medium text-[#8a6308]"
          style={delay(80)}
        >
          แพลตฟอร์มประเมินทักษะการเรียนรู้
        </span>

        <h1 className="mt-6 max-w-4xl text-3xl font-bold leading-[1.15] text-ink md:text-6xl">
          <span className="reveal block" style={delay(160)}>
            วัดผลก่อนเรียนและหลังเรียน
          </span>
          <span className="reveal block" style={delay(240)}>
            วิเคราะห์ความก้าวหน้า
          </span>
          <span className="reveal block" style={delay(320)}>
            ด้วยค่า <span className="text-primary-dark">Normalized Gain</span>
          </span>
        </h1>

        <p
          className="reveal mt-6 max-w-2xl text-base text-secondary md:text-lg"
          style={delay(420)}
        >
          ติดตามพัฒนาการของผู้เรียนอย่างเป็นระบบ พร้อมรายงานผลสัมฤทธิ์
          ให้ผู้สอนและผู้ดูแลแบบเรียลไทม์
        </p>

        <div
          className="reveal mt-9 flex flex-col items-center gap-3 sm:flex-row"
          style={delay(520)}
        >
          <Link
            href="/login"
            className="group inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-black"
          >
            เริ่มใช้งานเลย
            <ArrowRight
              className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
          <button
            type="button"
            onClick={scrollToFeatures}
            className="inline-flex items-center rounded-full border border-border bg-white/70 px-7 py-3.5 text-sm font-medium text-ink transition hover:border-primary hover:bg-primary-light"
          >
            ดูความสามารถของระบบ
          </button>
        </div>

        <div
          className="reveal absolute inset-x-0 bottom-6 mx-auto flex w-full max-w-6xl items-center justify-between px-6 text-xs text-muted"
          style={delay(620)}
        >
          <span>สำหรับสถาบันการศึกษา</span>
          <span className="hidden sm:inline">ฟรีสำหรับครูและนักเรียน</span>
          <span>เลื่อนเพื่อดูต่อ ↓</span>
        </div>
      </section>
    </>
  );
}