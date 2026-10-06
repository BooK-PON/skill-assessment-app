import { createClient } from '@/lib/supabase/client'

export interface LessonOrderRow {
  order_index: number | null
}

interface LessonRenumberRow {
  id: string
  order_index: number
  lesson_number: number
}

export const MAX_LESSONS_PER_COURSE = 10
export const MIN_LESSONS_PER_COURSE = 1

// ตรวจว่า URL ที่กรอกเป็นลิงก์บนอินเทอร์เน็ตจริง (http/https) หรือไม่
// กันการเก็บ path ในเครื่อง (file:///C:/...) ที่เบราว์เซอร์เปิดจากเว็บไม่ได้
export function isValidMediaUrl(url: string): boolean {
  if (!url || url.trim() === '') return true
  return /^https?:\/\//i.test(url.trim())
}

// แปลงลิงก์ Google Drive ให้ฝังใน iframe ได้:
//   view / open?id= -> preview (Drive จะปิดกั้นการฝังลิงก์แบบ view)
export function toPdfEmbedUrl(url: string): string {
  if (!url || !/drive\.google\.com/i.test(url)) return url
  const fileIdMatch = url.match(/\/file\/d\/([^/?#]+)/)
  if (fileIdMatch) return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`
  const idMatch = url.match(/[?&]id=([^&]+)/)
  if (idMatch) return `https://drive.google.com/file/d/${idMatch[1]}/preview`
  return url
}

const LESSON_FIELDS = 'id, order_index, lesson_number'

export function nextLessonOrder(lessons: LessonOrderRow[]): number {
  const max = lessons.reduce<number>((acc, lesson) => {
    const value = Number(lesson.order_index) || 0
    return value > acc ? value : acc
  }, 0)
  return max + 1
}

// questions.lesson_id และ assessment_scores.lesson_id เป็น ON DELETE CASCADE
// จึงห้ามลบแถว lessons เด็ดขาด ใช้การ UPDATE order_index/lesson_number เท่านั้น
// เพื่อเก็บ lessons.id เดิม (ข้อมูลข้อสอบและคะแนนจึงยังผูกกันอยู่)
export async function renumberLessons(courseId: string): Promise<boolean> {
  const supabase = createClient()

  const { data, error: readError } = await supabase
    .from('lessons')
    .select(LESSON_FIELDS)
    .eq('course_id', courseId)
    .order('order_index', { ascending: true })

  if (readError) {
    throw new Error('อ่านบทเรียนเพื่อเรียงเลขใหม่ไม่สำเร็จ: ' + readError.message)
  }

  const rows = (data ?? []) as LessonRenumberRow[]
  if (rows.length === 0) return true

  const alreadySequential = rows.every(
    (row, index) => Number(row.order_index) === index + 1 && Number(row.lesson_number) === index + 1,
  )
  if (alreadySequential) return true

  const blocked: number[] = []

  for (let index = 0; index < rows.length; index++) {
    const next = index + 1
    const { data: updated, error: updateError } = await supabase
      .from('lessons')
      .update({ order_index: next, lesson_number: next })
      .eq('id', rows[index].id)
      .select('id')

    if (updateError) {
      throw new Error('เรียงเลขบทเรียนใหม่ไม่สำเร็จ: ' + updateError.message)
    }
    if (!updated || updated.length === 0) {
      blocked.push(index + 1)
    }
  }

  if (blocked.length > 0) {
    throw new Error(
      'เรียงเลขบทเรียนไม่สำเร็จ เพราะไม่มีสิทธิ์แก้ไขบทเรียนลำดับที่ '
        + blocked.join(', ')
        + ' (ตรวจว่าบทนั้นอยู่ในคอร์สที่คุณเป็นผู้สร้าง)',
    )
  }

  return true
}
