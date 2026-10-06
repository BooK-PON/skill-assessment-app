import { csvCell } from './csv'

export interface GainScoreRow {
  user_id: string
  course_id: string
  score: number
  total_questions: number
  percentage: number | null
  assessment_type: string
  profiles?: { fullname?: string | null; email?: string | null } | null
  courses?: { title?: string | null } | null
}

export interface GainReportRow {
  userName: string
  courseTitle: string
  preRaw: number | null
  postRaw: number | null
  preTotal: number | null
  postTotal: number | null
  prePct: number | null
  postPct: number | null
  gain: number | null
  decreased: boolean
}

export type GainLevel = 'high' | 'mid' | 'low'

const round2 = (n: number) => Number(n.toFixed(2))

function toPercent(row: GainScoreRow): number | null {
  if (row.percentage !== null && row.percentage !== undefined) return round2(row.percentage)
  if (row.total_questions > 0) return round2((row.score / row.total_questions) * 100)
  return null
}

// Normalized Gain: g = (post% - pre%) / (100 - pre%)
// คำนวณจากร้อยละ จึงไม่พังเมื่อจำนวนข้อ Pre-test กับ Post-test ไม่เท่ากัน
// กรณี pre% = 100 (เพดานผลการเรียน) สูตรหารด้วยศูนย์ไม่ได้จึงตั้ง g = 0
// ตามแนวทาง Hake ที่ถือว่าไม่มีช่องให้เพิ่มขึ้นได้ จึงไม่นับเป็นการเรียนรู้สูง
export function computeGain(prePct: number | null, postPct: number | null): number | null {
  if (prePct === null || postPct === null) return null
  if (prePct >= 100) return 0
  return round2(Math.max(0, Math.min(1, (postPct - prePct) / (100 - prePct))))
}

export function gainLevel(gain: number | null): GainLevel | null {
  if (gain === null) return null
  if (gain >= 0.7) return 'high'
  if (gain >= 0.3) return 'mid'
  return 'low'
}

export const GAIN_LEVEL_LABELS: Record<GainLevel, string> = {
  high: 'เรียนรู้สูง',
  mid: 'เรียนรู้ปานกลาง',
  low: 'เรียนรู้น้อย',
}

// รายงาน Pre/Post/g รายคน-รายวิชา (ใช้ร่วมกันทั้ง admin/reports และ instructor/reports)
export function computeGainReport(rows: GainScoreRow[]): GainReportRow[] {
  const grouped = new Map<
    string,
    { userName: string; courseTitle: string; pre?: GainScoreRow; post?: GainScoreRow }
  >()

  rows.forEach((item) => {
    if (item.assessment_type !== 'pretest' && item.assessment_type !== 'posttest') return
    if (!item.total_questions || item.total_questions <= 0) return

    const key = `${item.user_id}_${item.course_id}`
    const entry = grouped.get(key) ?? {
      userName: item.profiles?.fullname || item.profiles?.email || 'ไม่ระบุชื่อ',
      courseTitle: item.courses?.title || 'วิชาเรียน',
    }
    if (item.assessment_type === 'pretest') entry.pre = item
    else entry.post = item
    grouped.set(key, entry)
  })

  return Array.from(grouped.values()).map((entry) => {
    const prePct = entry.pre ? toPercent(entry.pre) : null
    const postPct = entry.post ? toPercent(entry.post) : null
    return {
      userName: entry.userName,
      courseTitle: entry.courseTitle,
      preRaw: entry.pre?.score ?? null,
      postRaw: entry.post?.score ?? null,
      preTotal: entry.pre?.total_questions ?? null,
      postTotal: entry.post?.total_questions ?? null,
      prePct,
      postPct,
      gain: computeGain(prePct, postPct),
      decreased: prePct !== null && postPct !== null && postPct < prePct,
    }
  })
}

function rawCell(raw: number | null, total: number | null): string {
  if (raw === null || total === null) return '-'
  return `${raw}/${total}`
}

export function gainReportToCsv(rows: GainReportRow[]): string[] {
  const lines = [
    [
      csvCell('ผู้เรียน'),
      csvCell('รายวิชา'),
      csvCell('Pre-test (ถูก/ทั้งหมด)'),
      csvCell('Post-test (ถูก/ทั้งหมด)'),
      csvCell('Pre-test (%)'),
      csvCell('Post-test (%)'),
      csvCell('Normalized Gain (g)'),
      csvCell('ระดับการเรียนรู้'),
      csvCell('หมายเหตุ'),
    ].join(','),
  ]

  rows.forEach((r) => {
    lines.push(
      [
        csvCell(r.userName),
        csvCell(r.courseTitle),
        csvCell(rawCell(r.preRaw, r.preTotal)),
        csvCell(rawCell(r.postRaw, r.postTotal)),
        r.prePct === null ? '-' : r.prePct.toFixed(2),
        r.postPct === null ? '-' : r.postPct.toFixed(2),
        r.gain === null ? '-' : r.gain.toFixed(2),
        csvCell(r.gain === null ? '-' : GAIN_LEVEL_LABELS[gainLevel(r.gain) as GainLevel]),
        csvCell(r.decreased ? 'คะแนนลดลงจากก่อนเรียน' : ''),
      ].join(','),
    )
  })

  const done = rows.map((r) => r.gain).filter((g): g is number => g !== null)
  if (done.length > 0) {
    const avg = round2(done.reduce((s, g) => s + g, 0) / done.length)
    lines.push(
      [
        csvCell(`ค่าเฉลี่ย (${done.length} คนที่ทำครบ)`),
        '', '', '', '', '',
        csvCell(avg.toFixed(2)),
        csvCell(GAIN_LEVEL_LABELS[gainLevel(avg) as GainLevel]),
        '',
      ].join(','),
    )
  }

  return lines
}