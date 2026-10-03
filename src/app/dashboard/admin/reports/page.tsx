'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BarChart3, Download } from 'lucide-react'
import Skeleton from '@/components/ui/Skeleton'
import { downloadCsv } from '@/lib/csv'
import { computeGainReport, gainLevel, gainReportToCsv, GainReportRow, GainScoreRow } from '@/lib/gain'

export default function AnalyticsReportPage() {
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState<GainReportRow[]>([])
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
        setReportData(computeGainReport(data as unknown as GainScoreRow[]))
      }
      setLoading(false)
    }

    fetchScores()
  }, [])

  const exportCsv = () => {
    downloadCsv('gain-report.csv', gainReportToCsv(reportData))
  }

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

        <div className="border-b border-border pb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-purple-600" /> รายงานวิเคราะห์ผลสัมฤทธิ์ทางการเรียน (Analytics & Gain)
            </h1>
            <p className="text-secondary text-xs mt-1">เปรียบเทียบคะแนน Pre-test และ Post-test ด้วยดัชนีผลการเรียนรู้ที่เพิ่มขึ้นแบบบรรทัดฐาน (Normalized Gain: g)</p>
          </div>
          {reportData.length > 0 && (
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 bg-white hover:bg-surface border border-border text-sm font-medium px-4 py-2 rounded-lg transition"
            >
              <Download className="w-4 h-4" />
              ส่งออก CSV
            </button>
          )}
        </div>

        {error ? (
          <div role="alert" className="bg-red-500/10 border border-red-500/20 text-red-600 p-4 rounded-xl text-sm">
            เกิดข้อผิดพลาดในการโหลดรายงาน: {error}
          </div>
        ) : (
        <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
          {reportData.length === 0 ? (
            <div className="p-12 text-center text-secondary text-sm">
              ยังไม่มีข้อมูลการประเมินในขณะนี้
            </div>
          ) : (
<div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-ink min-w-[640px]">
              <thead className="bg-surface text-secondary text-xs uppercase border-b border-border">
                <tr>
                  <th className="p-4">ผู้เรียน</th>
                  <th className="p-4">รายวิชา</th>
                  <th className="p-4 text-center">Pre-test (ถูก/ทั้งหมด)</th>
                  <th className="p-4 text-center">Post-test (ถูก/ทั้งหมด)</th>
                  <th className="p-4 text-center">Pre (%)</th>
                  <th className="p-4 text-center">Post (%)</th>
                  <th className="p-4 text-center">Normalized Gain ($g$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reportData.map((row, idx) => {
                  const level = gainLevel(row.gain)
                  return (
                  <tr key={idx} className="hover:bg-surface transition">
                    <td className="p-4 font-medium text-ink">{row.userName}</td>
                    <td className="p-4 text-secondary">{row.courseTitle}</td>
                    <td className="p-4 text-center text-secondary text-xs">{row.preRaw !== null ? `${row.preRaw}/${row.preTotal}` : '-'}</td>
                    <td className="p-4 text-center text-secondary text-xs">{row.postRaw !== null ? `${row.postRaw}/${row.postTotal}` : '-'}</td>
                    <td className="p-4 text-center text-blue-600 font-bold">{row.prePct !== null ? `${row.prePct}%` : '-'}</td>
                    <td className="p-4 text-center text-purple-600 font-bold">{row.postPct !== null ? `${row.postPct}%` : '-'}</td>
                    <td className="p-4 text-center">
                      {row.gain !== null ? (
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${
                          level === 'high'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : level === 'mid'
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                        }`}>
                            g = {row.gain} ({level === 'high' ? 'เรียนรู้สูง' : level === 'mid' ? 'เรียนรู้ปานกลาง' : 'เรียนรู้น้อย'})
                            {row.decreased && ' · คะแนนลดลง'}
                        </span>
                      ) : (
                        <span className="text-secondary text-xs">ยังทำไม่ครบทั้ง 2 ชุด</span>
                      )}
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          )}
        </div>
        )}

      </div>
    </div>
  )
}
