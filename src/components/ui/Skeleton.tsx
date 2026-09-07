export default function Skeleton({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-border/70 ${className}`}
      aria-hidden="true"
      {...props}
    />
  );
}