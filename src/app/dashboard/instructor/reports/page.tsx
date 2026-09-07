'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BarChart3 } from 'lucide-react'
import Skeleton from '@/components/ui/Skeleton'

interface ScoreRecord {
  user_id: string
  course_id: string
  score: number
  total_questions: number
  assessment_type: string
  profiles?: { fullname: string; email: string }
  courses?: { title: string }
}

export default function InstructorAnalyticsReportPage() {
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function fetchScores() {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('assessment_scores')
        .select('*, profiles(fullname, email), courses(title)')

      if (error) {
        setError(error.message)
      } else if (data) {
        const grouped: Record<string, any> = {}

        data.forEach((item: ScoreRecord) => {
          const key = `${item.user_id}_${item.course_id}`
          if (!grouped[key]) {
            grouped[key] = {
              userName: item.profiles?.fullname || item.profiles?.email || 'ไม่ระบุชื่อ',
              courseTitle: item.courses?.title || 'วิชาเรียน',
              preTest: null,
              postTest: null,
              totalScore: item.total_questions || 20,
            }
          }

          if (item.assessment_type === 'pretest') grouped[key].preTest = item.score
          if (item.assessment_type === 'posttest') grouped[key].postTest = item.score
        })

        const processed = Object.values(grouped).map((row) => {
          let g = null
          if (row.preTest !== null && row.postTest !== null) {
            const maxScore = row.totalScore
            const gainNumerator = row.postTest - row.preTest
            const gainDenominator = maxScore - row.preTest
            if (gainDenominator <= 0) {
              g = '1.00'
            } else {
              g = Math.max(0, Math.min(1, gainNumerator / gainDenominator)).toFixed(2)
            }
          }
          return { ...row, gain: g }
        })

        setReportData(processed)
      }
      setLoading(false)
    }

    fetchScores()
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-8 w-80" />
          <Skeleton className="h-4 w-64" />
          <div className="space-y-3">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        <div className="border-b border-border pb-4">
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-600" /> รายงานวิเคราะห์ผลสัมฤทธิ์ทางการเรียน
          </h1>
          <p className="text-secondary text-xs mt-1">เปรียบเทียบคะแนน Pre-test และ Post-test ด้วย Normalized Gain (g)</p>
        </div>

        {error ? (
          <div role="alert" className="bg-red-500/10 border border-red-500/20 text-red-600 p-4 rounded-xl text-sm">
            เกิดข้อผิดพลาดในการโหลดรายงาน: {error}
          </div>
        ) : reportData.length === 0 ? (
          <div className="bg-white border border-border rounded-2xl p-12 text-center text-secondary">
            ยังไม่มีข้อมูลการประเมินในขณะนี้
          </div>
        ) : (
          <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-ink min-w-[640px]">
                <thead className="bg-surface text-secondary text-xs uppercase border-b border-border">
                  <tr>
                    <th className="p-4">ผู้เรียน</th>
                    <th className="p-4">รายวิชา</th>
                    <th className="p-4 text-center">Pre-test</th>
                    <th className="p-4 text-center">Post-test</th>
                    <th className="p-4 text-center">Normalized Gain (g)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reportData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-surface transition">
                      <td className="p-4 font-medium text-ink">{row.userName}</td>
                      <td className="p-4 text-secondary">{row.courseTitle}</td>
                      <td className="p-4 text-center text-blue-600 font-bold">{row.preTest ?? '-'}</td>
                      <td className="p-4 text-center text-purple-600 font-bold">{row.postTest ?? '-'}</td>
                      <td className="p-4 text-center">
                        {row.gain !== null ? (
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${
                            Number(row.gain) >= 0.7
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : Number(row.gain) >= 0.3
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                          }`}>
                            g = {row.gain} ({Number(row.gain) >= 0.7 ? 'เรียนรู้สูง' : Number(row.gain) >= 0.3 ? 'เรียนรู้ปานกลาง' : 'เรียนรู้น้อย'})
                          </span>
                        ) : (
                          <span className="text-secondary text-xs">ยังทำไม่ครบทั้ง 2 ชุด</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
