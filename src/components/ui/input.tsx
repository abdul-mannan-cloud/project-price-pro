import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, labelClassName, ...props }, ref) => {
    return (
      <div className="form-group flex">
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
          <label className={cn("form-label",labelClassName)} >
            {label}
          </label>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }