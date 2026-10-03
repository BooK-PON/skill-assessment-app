import { BarChart3, BookOpenCheck, ShieldCheck } from 'lucide-react'

const highlights = [
  {
    icon: BarChart3,
    title: 'นักเรียน',
    desc: 'แบบทดสอบก่อน-หลังเรียน พร้อมกราฟทักษะ 5 ด้านและคำแนะนำคอร์ส',
  },
  {
    icon: BookOpenCheck,
    title: 'ผู้สอน',
    desc: 'สร้างบทเรียน วิดีโอ ข้อสอบ และติดตามผลการเรียนรู้รายบุคคล',
  },
  {
    icon: ShieldCheck,
    title: 'ผู้ดูแลระบบ',
    desc: 'รายงานภาพรวม ความพึงพอใจ และส่งออกข้อมูลเป็นไฟล์ CSV',
  },
]

export default function Auth3DHero() {
  return (
    <aside className="auth-hero relative flex h-full min-h-[280px] w-full flex-col justify-center overflow-hidden bg-white px-6 py-10 sm:px-10 lg:min-h-0 lg:px-12 lg:py-14">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[38vh] bg-[radial-gradient(900px_460px_at_20%_0%,rgba(244,183,64,0.10),rgba(255,255,255,0))]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_620px_at_20%_0%,rgba(255,255,255,1),rgba(250,250,248,1))]" />

      <div className="relative z-10 mx-auto w-full max-w-lg">
        <span className="reveal inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-secondary shadow-sm" data-order="1">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          ระบบประเมินทักษะการเรียนรู้
        </span>

        <h1 className="reveal mt-5 text-balance text-3xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-4xl lg:text-[2.75rem]" data-order="2">
          วัดการเรียนรู้
          <br />
          ให้เห็น <span className="text-primary-dark">ความก้าวหน้า</span>
        </h1>

        <p className="reveal mt-4 max-w-md text-pretty text-sm text-secondary sm:text-base" data-order="3">
          แบบทดสอบก่อน-หลังเรียน วิเคราะห์ทักษะ 5 ด้าน และแบบประเมินความพึงพอใจ
          รวมไว้ในระบบเดียว
        </p>

        <ul className="mt-8 space-y-3 sm:mt-10 sm:space-y-4">
          {highlights.map((item, index) => (
            <li
              key={item.title}
              className="reveal play-row flex items-start gap-3 rounded-2xl border border-border bg-white/80 p-3.5 shadow-sm backdrop-blur transition-colors duration-200 hover:border-primary/40 hover:bg-white sm:gap-4 sm:p-4"
              data-order={index + 4}
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary-dark ring-1 ring-primary/20">
                <item.icon className="play-icon h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{item.title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-secondary sm:text-sm">
                  {item.desc}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="reveal pointer-events-none absolute inset-x-0 bottom-0 hidden select-none overflow-hidden lg:block" data-order="6">
        <span className="block translate-y-3 text-center text-[clamp(72px,7vw,120px)] font-black uppercase tracking-[0.08em] text-primary/10">
          E-Learning Hub
        </span>
      </div>

      <div className="relative z-10 mt-10 hidden items-center gap-3 border-t border-border pt-5 text-xs text-muted lg:flex">
        <span className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-success/70" />
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span className="h-2 w-2 rounded-full bg-border" />
        </span>
        ระบบพร้อมใช้งาน • เข้าสู่ระบบเพื่อเริ่มการประเมิน
      </div>
    </aside>
  )
}