'use client'

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

type ToastTone = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneIcon: Record<ToastTone, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />,
  error: <AlertTriangle className="h-5 w-5 text-danger" aria-hidden="true" />,
  warning: <AlertTriangle className="h-5 w-5 text-warning" aria-hidden="true" />,
  info: <Info className="h-5 w-5 text-info" aria-hidden="true" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "info") => {
      idRef.current += 1;
      const id = idRef.current;
      setToasts((prev) => [...prev, { id, message, tone }]);
      window.setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex max-w-sm flex-col gap-2"
        aria-live="polite"
        role="status"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-white p-4 shadow-lg"
          >
            <span className="mt-0.5 shrink-0">{toneIcon[t.tone]}</span>
            <p className="flex-1 pt-0.5 text-sm text-ink">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="ปิดการแจ้งเตือน"
              className="shrink-0 rounded-lg p-1 text-muted transition hover:bg-surface hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}