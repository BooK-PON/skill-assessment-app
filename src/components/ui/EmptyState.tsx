import { Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center ${className}`}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-muted border border-border">
        {icon ?? <Inbox className="h-6 w-6" aria-hidden="true" />}
      </div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}