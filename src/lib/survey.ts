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