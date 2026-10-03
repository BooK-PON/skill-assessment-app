export const SURVEY_DIMENSIONS = [
  { key: 'content', label: 'เนื้อหาและคุณภาพวิชา' },
  { key: 'media', label: 'สื่อการเรียน' },
  { key: 'usability', label: 'ความสะดวกในการใช้งาน' },
  { key: 'performance', label: 'ความเร็วและประสิทธิภาพ' },
  { key: 'reliability', label: 'ความน่าเชื่อถือของข้อมูล' },
] as const

export type SurveyDimensionKey = (typeof SURVEY_DIMENSIONS)[number]['key']

export const SURVEY_DIMENSION_LABELS: Record<string, string> =
  Object.fromEntries(SURVEY_DIMENSIONS.map((d) => [d.key, d.label]))

export const SKILL_DIMENSIONS = [
  { key: 'knowledge', label: 'ความรู้พื้นฐาน' },
  { key: 'analysis', label: 'การวิเคราะห์' },
  { key: 'application', label: 'การประยุกต์ใช้' },
  { key: 'problem_solving', label: 'การแก้ปัญหา' },
  { key: 'creativity', label: 'ความคิดสร้างสรรค์' },
] as const

export type SkillDimensionKey = (typeof SKILL_DIMENSIONS)[number]['key']

export const SKILL_DIMENSION_LABELS: Record<string, string> =
  Object.fromEntries(SKILL_DIMENSIONS.map((d) => [d.key, d.label]))

export interface SkillAttemptRow {
  assessment_type: string
  skill_dimension: string
  is_correct: boolean
}

export interface SkillDim {
  key: string
  label: string
  pre: number | null
  post: number | null
  preCount: number
  postCount: number
}

function pctGroup(rows: SkillAttemptRow[], type: 'pretest' | 'posttest'): Record<string, { pct: number; count: number }> {
  const dims: Record<string, { correct: number; total: number }> = {}
  rows
    .filter((r) => r.assessment_type === type)
    .forEach((r) => {
      const d = dims[r.skill_dimension] || { correct: 0, total: 0 }
      d.total += 1
      if (r.is_correct) d.correct += 1
      dims[r.skill_dimension] = d
    })
  const out: Record<string, { pct: number; count: number }> = {}
  Object.entries(dims).forEach(([k, v]) => {
    out[k] = { pct: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0, count: v.total }
  })
  return out
}

// คำนวณร้อยละความถูกต้องรายทักษะ (Pre vs Post) จาก assessment_attempts ของ 1 คอร์ส (หรือชุดข้อมูลใด ๆ)
export function computeSkillDims(rows: SkillAttemptRow[]): SkillDim[] {
  const pre = pctGroup(rows, 'pretest')
  const post = pctGroup(rows, 'posttest')
  return SKILL_DIMENSIONS.map((d) => ({
    key: d.key,
    label: d.label,
    pre: pre[d.key] !== undefined ? pre[d.key].pct : null,
    post: post[d.key] !== undefined ? post[d.key].pct : null,
    preCount: pre[d.key]?.count ?? 0,
    postCount: post[d.key]?.count ?? 0,
  }))
}