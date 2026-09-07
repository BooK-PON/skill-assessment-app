interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export default function Card({ padded = true, className = "", children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-border bg-white shadow-sm ${
        padded ? "p-6" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}