'use client'

import { useEffect } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: "default" | "danger";
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "ยืนยัน",
  cancelText = "ยกเลิก",
  loading = false,
  onConfirm,
  onCancel,
  tone = "default",
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-white p-6 shadow-2xl">
        <div className="border-b border-border pb-3">
          <h3 className="text-base font-bold text-ink">{title}</h3>
        </div>
        <div className="text-sm text-secondary">{message}</div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-surface disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${
              tone === "danger" ? "bg-danger hover:bg-danger/90" : "bg-primary text-ink hover:bg-primary-dark"
            }`}
          >
            {loading ? "กำลังดำเนินการ..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}