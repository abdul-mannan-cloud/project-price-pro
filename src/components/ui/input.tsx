import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, ...props }, ref) => {
    return (
      <div className="form-group">
        <input
          type={type}
          className={cn(
            "form-input",
            className
          )}
          ref={ref}
          placeholder=" "
          {...props}
        />
        {label && (
          <label className="form-label">
            {label}
          </label>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }