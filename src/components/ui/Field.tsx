interface FieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  helper?: string;
  children: React.ReactNode;
  className?: string;
}

export default function Field({
  label,
  htmlFor,
  required = false,
  error,
  helper,
  children,
  className = "",
}: FieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
        {required && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : helper ? (
        <p className="text-xs text-muted">{helper}</p>
      ) : null}
    </div>
  );
}