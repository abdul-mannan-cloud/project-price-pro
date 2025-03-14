import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  className?: string;
}

const CustomSelect = ({
  label,
  value,
  onValueChange,
  options,
  className,
}: CustomSelectProps) => {
  return (
    <div className="select-wrapper">
      <span className="select-label">{label}</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={cn("select-trigger", className)}>
          <SelectValue placeholder=" " />
        </SelectTrigger>
        <SelectContent className="z-[100] bg-background border border-input rounded-lg shadow-sm">
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="cursor-pointer hover:bg-[#f5f5f7] text-[15px] text-foreground"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export { CustomSelect }