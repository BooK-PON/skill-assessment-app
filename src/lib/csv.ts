// Helper กลางสำหรับส่งออก CSV (ใช้ BOM \uFEFF เพื่อให้ Excel อ่านภาษาไทยได้ถูกต้อง)
export function csvCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? '' : String(value)
  return `"${s.replace(/"/g, '""')}"`
}

export function buildCsv(lines: string[]): string {
  return '\uFEFF' + lines.join('\r\n')
}

export function downloadCsv(filename: string, lines: string[]): void {
  const blob = new Blob([buildCsv(lines)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}