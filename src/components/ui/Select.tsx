import { forwardRef } from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ error = false, className = "", children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`w-full rounded-lg border bg-white px-4 py-2.5 text-sm text-ink transition focus:outline-none focus:ring-2 focus:ring-primary/40 ${
          error ? "border-danger" : "border-border hover:border-primary-dark/40"
        } ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  }
);

Select.displayName = "Select";

export default Select;