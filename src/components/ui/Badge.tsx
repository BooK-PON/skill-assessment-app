type BadgeTone = "neutral" | "primary" | "success" | "danger" | "info" | "warning";

interface BadgeProps {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-surface text-secondary border-border",
  primary: "bg-primary-light text-[#8a6308] border-primary/40",
  success: "bg-success/10 text-success border-success/30",
  danger: "bg-danger/10 text-danger border-danger/30",
  info: "bg-info/10 text-info border-info/30",
  warning: "bg-warning/10 text-warning border-warning/30",
};

export default function Badge({ tone = "neutral", className = "", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}