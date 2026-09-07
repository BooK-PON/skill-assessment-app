import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  loadingText?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-ink font-semibold shadow-sm hover:bg-primary-dark focus-visible:outline-primary-dark disabled:bg-primary/60",
  secondary:
    "bg-white text-ink border border-border font-medium hover:bg-surface hover:border-primary-dark/50 disabled:opacity-50",
  ghost:
    "bg-transparent text-secondary font-medium hover:bg-surface hover:text-ink disabled:opacity-50",
  danger:
    "bg-danger text-white font-semibold shadow-sm hover:bg-danger/90 disabled:opacity-50",
};

export default function Button({
  variant = "primary",
  loading = false,
  loadingText = "กำลังประมวลผล...",
  children,
  className = "",
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition ${
        variantClasses[variant]
      } disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      <span>{loading ? loadingText : children}</span>
    </button>
  );
}