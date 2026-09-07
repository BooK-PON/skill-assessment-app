import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error = false, className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full rounded-lg border bg-white px-4 py-2.5 text-sm text-ink transition placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 ${
          error ? "border-danger" : "border-border hover:border-primary-dark/40"
        } ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export default Input;