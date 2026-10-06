export const DEFAULT_COURSE_CAPACITY = 25
export const MIN_COURSE_CAPACITY = 1
export const MAX_COURSE_CAPACITY = 500

export interface CapacitySource {
  capacity?: number | null
}

export function capacityOf(course: CapacitySource | null | undefined): number {
  const raw = course?.capacity
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return DEFAULT_COURSE_CAPACITY
  const rounded = Math.floor(raw)
  if (rounded < MIN_COURSE_CAPACITY) return MIN_COURSE_CAPACITY
  if (rounded > MAX_COURSE_CAPACITY) return MAX_COURSE_CAPACITY
  return rounded
}

export function seatsLeft(activeCount: number | null | undefined, capacity: number): number {
  const left = capacity - (activeCount ?? 0)
  return left > 0 ? left : 0
}

export function isCourseFull(activeCount: number | null | undefined, capacity: number): boolean {
  return (activeCount ?? 0) >= capacity
}

export function capacityLabel(activeCount: number | null | undefined, capacity: number): string {
  const active = activeCount ?? 0
  if (isCourseFull(active, capacity)) return `คอร์สเต็มแล้ว (${active}/${capacity})`
  return `ที่นั่งว่าง ${seatsLeft(active, capacity)} จาก ${capacity}`
}

export function occupancyLabel(activeCount: number | null | undefined, capacity: number): string {
  return `${activeCount ?? 0}/${capacity} ที่นั่ง`
}

export function fullCourseMessage(capacity: number): string {
  return `คอร์สนี้เต็มแล้ว (รองรับผู้เรียนสูงสุด ${capacity} คน)`
}

export interface CapacityParse {
  value: number
  error: string | null
}

export function parseCapacity(input: string | number): CapacityParse {
  const raw = String(input).trim()
  if (raw === '') return { value: DEFAULT_COURSE_CAPACITY, error: null }
  const num = Number(raw)
  if (!Number.isInteger(num)) {
    return { value: DEFAULT_COURSE_CAPACITY, error: 'กรุณากรอกจำนวนผู้เรียนเป็นจำนวนเต็ม' }
  }
  if (num < MIN_COURSE_CAPACITY || num > MAX_COURSE_CAPACITY) {
    return {
      value: DEFAULT_COURSE_CAPACITY,
      error: `กรุณากรอกระหว่าง ${MIN_COURSE_CAPACITY} - ${MAX_COURSE_CAPACITY} คน`,
    }
  }
  return { value: num, error: null }
}

export function capacityReduceError(
  newCapacity: number,
  activeCount: number | null | undefined,
): string | null {
  const active = activeCount ?? 0
  if (newCapacity < active) {
    return `ตั้งความจุได้ไม่ต่ำกว่าผู้เรียนที่ลงทะเบียนแล้ว (${active} คน)`
  }
  return null
}
