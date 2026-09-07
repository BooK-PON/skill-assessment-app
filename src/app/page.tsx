import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  BarChart3,
  BookOpenCheck,
  ClipboardCheck,
  GraduationCap,
  TrendingUp,
} from "lucide-react";
import Card from "@/components/ui/Card";
import LandingShell from "@/components/landing/LandingShell";

const features = [
  {
    icon: ClipboardCheck,
    title: "ทดสอบก่อนเรียน-หลังเรียน",
    description:
      "ประเมินความเข้าใจของผู้เรียนด้วยแบบทดสอบก่อนเรียนและหลังเรียนในแต่ละรายวิชา",
  },
  {
    icon: TrendingUp,
    title: "วิเคราะห์ค่า Normalized Gain",
    description:
      "วัดระดับพัฒนาการทางการเรียนรู้อัตโนมัติด้วยค่า Normalized Gain ที่เป็นมาตรฐาน",
  },
  {
    icon: BookOpenCheck,
    title: "จัดการรายวิชาและบทเรียน",
    description:
      "ผู้สอนสามารถสร้างรายวิชา บทเรียน และชุดข้อสอบได้ในที่เดียวอย่างเป็นระบบ",
  },
  {
    icon: BarChart3,
    title: "รายงานรายบุคคลและรายกลุ่ม",
    description:
      "ผู้ดูแลและผู้สอนเห็นภาพรวมพัฒนาการของผู้เรียนทั้งรายบุคคลและทั้งห้องเรียน",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <LandingShell>
      <main className="flex-1">
        <section id="features" className="border-t border-border bg-surface py-20">
          <div className="mx-auto w-full max-w-6xl px-6">
            <h2 className="text-center text-2xl font-bold text-ink md:text-3xl">
              ความสามารถหลักของระบบ
            </h2>
            <p className="mt-3 text-center text-sm text-muted">
              ออกแบบมาสำหรับสถาบันการศึกษา เพื่อยกระดับคุณภาพการเรียนการสอน
            </p>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <Card key={f.title} className="flex flex-col rounded-2xl p-6 text-left">
                  <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-light text-primary-dark">
                    <f.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="text-base font-semibold text-ink">{f.title}</h3>
                  <p className="mt-2 text-sm text-secondary">{f.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-center sm:flex-row sm:text-left">
          <p className="flex items-center gap-2 text-sm text-muted">
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
            E-Learning Hub — ระบบประเมินทักษะการเรียนรู้
          </p>
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} สถาบันการศึกษา. สงวนลิขสิทธิ์
          </p>
        </div>
      </footer>
    </LandingShell>
  );
}