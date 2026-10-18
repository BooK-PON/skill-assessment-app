'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { toYouTubeEmbedUrl } from '@/lib/lessons'
import { Video } from 'lucide-react'

export interface LessonDraft {
  title: string
  content: string
  video_url: string
  pdf_url: string
}

export interface LessonFormInitial {
  title: string
  content: string
  video_url: string
  pdf_url: string
}

interface LessonFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  initial?: LessonFormInitial | null
  nextOrder: number
  submitting: boolean
  onClose: () => void
  onSubmit: (draft: LessonDraft) => void
}

export default function LessonFormModal({
  open,
  mode,
  initial,
  nextOrder,
  submitting,
  onClose,
  onSubmit,
}: LessonFormModalProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [videoUrl, setVideoUrl] = useState(initial?.video_url ?? '')
  const [pdfUrl, setPdfUrl] = useState(initial?.pdf_url ?? '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      title: title.trim(),
      content: content.trim(),
      video_url: videoUrl.trim(),
      pdf_url: pdfUrl.trim(),
    })
  }

  const embedUrl = videoUrl ? toYouTubeEmbedUrl(videoUrl) : null
  const isDirectVideo = /\.(mp4|webm|ogg|m4v|mov)([?#]|$)/i.test(videoUrl)
  const hasVideoUrl = videoUrl.trim().length > 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidth="max-w-xl"
      title={mode === 'edit' ? 'แก้ไขบทเรียน' : `เพิ่มบทเรียนที่ ${nextOrder}`}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="lesson-title" className="block text-xs font-semibold text-ink mb-1">ชื่อบทเรียน *</label>
          <input
            id="lesson-title"
            type="text"
            required
            placeholder="เช่น บทที่ 1: แนะนำเนื้อหาเบื้องต้น"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-white border border-border rounded-lg p-2.5 text-sm text-ink focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label htmlFor="lesson-content" className="block text-xs font-semibold text-ink mb-1">คำอธิบาย/เนื้อหาบทเรียน</label>
          <textarea
            id="lesson-content"
            rows={3}
            placeholder="สรุปเนื้อหาสั้นๆ ของบทนี้..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full bg-white border border-border rounded-lg p-2.5 text-sm text-ink focus:outline-none focus:border-purple-500 resize-none"
          />
        </div>

        <div>
          <label htmlFor="video-url" className="block text-xs font-semibold text-ink mb-1">URL คลิปวิดีโอ (YouTube หรือ Supabase Storage)</label>
          <input
            id="video-url"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="w-full bg-white border border-border rounded-lg p-2.5 text-sm text-ink focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold text-ink">ตัวอย่างวิดีโอ (ตรวจก่อนบันทึก)</p>
          {embedUrl ? (
            <iframe
              key={embedUrl}
              src={`${embedUrl}?hl=th`}
              title="ตัวอย่างวิดีโอ (YouTube)"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="aspect-video w-full rounded-lg border border-border"
            />
          ) : isDirectVideo && hasVideoUrl ? (
            <video key={videoUrl} src={videoUrl} controls className="w-full rounded-lg border border-border" />
          ) : hasVideoUrl ? (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface p-6 text-xs text-secondary text-center">
              <Video className="h-5 w-5 shrink-0" /> ตัวอย่างแสดงได้เฉพาะลิงก์ YouTube และไฟล์วิดีโอโดยตรง (mp4/webm) — URL นี้จะยังถูกบันทึกได้ตามปกติ
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface p-6 text-xs text-secondary text-center">
              <Video className="h-5 w-5 shrink-0" /> พิมพ์ URL วิดีโอแล้วตัวอย่างจะแสดงที่นี่
            </div>
          )}
        </div>

        <div>
          <label htmlFor="pdf-url" className="block text-xs font-semibold text-ink mb-1">URL เอกสารประกอบ (PDF)</label>
          <input
            id="pdf-url"
            type="url"
            placeholder="https://.../document.pdf"
            value={pdfUrl}
            onChange={(e) => setPdfUrl(e.target.value)}
            className="w-full bg-white border border-border rounded-lg p-2.5 text-sm text-ink focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm bg-white border border-border text-secondary hover:bg-surface"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm bg-purple-600 text-white font-medium hover:bg-purple-500 disabled:opacity-50"
          >
            {submitting ? 'กำลังบันทึก...' : mode === 'edit' ? 'บันทึกการแก้ไข' : 'บันทึกบทเรียน'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
