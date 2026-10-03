'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { History, TriangleAlert } from 'lucide-react'
import Skeleton from '@/components/ui/Skeleton'

interface LogRow {
  id: string
  user_id: string | null
  action: string
  target_type: string | null
  target_id: string | null
  detail: string | null
  created_at: string
  profiles?: { fullname?: string; email?: string }
}

const actionLabels: Record<string, string> = {
  change_role: 'เปลี่ยนบทบาท',
  create_course: 'สร้างรายวิชา',
  edit_course: 'แก้ไขรายวิชา',
  delete_course: 'ลบรายวิชา',
  toggle_course_status: 'สลับสถานะรายวิชา',
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function fetchLogs() {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*, profiles(fullname, email)')
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) {
        setError('ไม่สามารถดึงข้อมูลประวัติการใช้งานได้: ' + error.message)
      } else if (data) {
        setLogs(data as unknown as LogRow[])
      }
      setLoading(false)
    }
    fetchLogs()
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-8 w-80" />
          <Skeleton className="h-4 w-96" />
          <div className="space-y-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        <div className="border-b border-border pb-4">
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <History className="w-6 h-6 text-rose-600" /> ประวัติการใช้งานระบบ
          </h1>
          <p className="text-secondary text-sm mt-1">บันทึกกิจกรรมสำคัญในระบบ เช่น การเปลี่ยนบทบาทและการจัดการรายวิชา</p>
        </div>

        {error && (
          <div role="alert" className="bg-rose-500/10 border border-rose-500/50 rounded-lg p-3 text-sm text-rose-600">
            {error}
          </div>
        )}

        <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
          {logs.length === 0 ? (
            <div className="p-10 text-center text-secondary flex items-center justify-center gap-2">
              <TriangleAlert className="w-5 h-5" /> ยังไม่มีบันทึกกิจกรรม
            </div>
          ) : (
            <div className="divide-y divide-border">
              {logs.map((log) => (
                <div key={log.id} className="p-4 flex items-start gap-3 hover:bg-surface transition">
                  <div className="p-2 bg-surface text-secondary rounded-lg w-fit shrink-0">
                    <History className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink">
                      <span className="font-semibold text-ink">
                        {log.profiles?.fullname || log.profiles?.email || 'ระบบ'}
                      </span>
                      {' '}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20">
                        {actionLabels[log.action] || log.action}
                      </span>
                    </p>
                    {log.detail && <p className="text-xs text-secondary mt-0.5">{log.detail}</p>}
                  </div>
                  <span className="text-xs text-secondary shrink-0">
                    {log.created_at ? new Date(log.created_at).toLocaleString('th-TH') : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
