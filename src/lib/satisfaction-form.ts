// ลิงก์ Google Form แบบประเมินความพึงพอใจผู้ใช้งานระบบ E-Learning Hub
// เปลี่ยนมาเก็บข้อมูลผ่าน Google Forms ตามข้อเสนออาจารย์ — ฟอร์มไม่เก็บชื่อ/อีเมลผู้ตอบ
// สร้างด้วย Temp/opencode/create_ioc_form.gs · ข้อคำถามตามแบบสอบถาม IOC 20 ข้อ 5 ด้าน
// URL นี้เป็นแบบ public (ไม่เปลี่ยนถ้าแก้คำถามในฟอร์มเดิม)
export const SATISFACTION_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSegE359mHEgZv-_tU_haNTz77a9125OJCtACyG_Or7i-3TNBw/viewform'

export function openSatisfactionForm(): void {
  window.open(SATISFACTION_FORM_URL, '_blank', 'noopener,noreferrer')
}
