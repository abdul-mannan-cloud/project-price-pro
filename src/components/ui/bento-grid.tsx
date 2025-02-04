import { cn } from "@/lib/utils";
import { Button } from "./button";
import { ChevronRight } from "lucide-react";

interface BentoCardProps {
  name: string;
  description: string;
  Icon?: React.ElementType;
  href?: string;
  cta?: string;
  background?: React.ReactNode;
  className?: string;
  content?: React.ReactNode;
  detailContent?: React.ReactNode;
  actions?: React.ReactNode;
  onClick?: () => void;
  showActions?: boolean;
  actionIcon?: React.ReactNode;
}

export const BentoCard = ({
  name,
  description,
  Icon,
  href,
  cta,
  background,
  className,
  content,
  detailContent,
  actions,
  onClick,
  showActions,
  actionIcon,
}: BentoCardProps) => {
  const isPreviewEstimator = name === "Preview Estimator";
  
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border p-6",
        className
      )}
    >
      {background}
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5" />}
            <h3 className="font-medium">{name}</h3>
          </div>
          {showActions && actionIcon}
        </div>
        <p className="mt-2 text-muted-foreground">{description}</p>
        {content}
        {actions && (
          <div className={cn(
            "flex gap-2",
            isPreviewEstimator ? "text-white" : ""
          )}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <div className={cn("grid gap-4", className)}>
      {children}
    </div>
  );
};