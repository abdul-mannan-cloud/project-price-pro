import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { Button } from "./button";

interface BentoGridProps {
  className?: string;
  children?: React.ReactNode;
}

interface BentoCardProps {
  className?: string;
  Icon?: any;
  name?: string;
  description?: string;
  href?: string;
  cta?: string;
  background?: React.ReactNode;
  content?: React.ReactNode;
  detailContent?: React.ReactNode;
  actions?: React.ReactNode;
  onClick?: () => void;
  showActions?: boolean;
  actionIcon?: React.ReactNode;
}

export function BentoGrid({
  className,
  children,
}: BentoGridProps) {
  return (
    <div className={cn("grid", className)}>
      {children}
    </div>
  );
}

export function BentoCard({
  className,
  Icon,
  name,
  description,
  href,
  cta,
  background,
  content,
  actions,
  onClick,
  showActions,
  actionIcon = <ChevronRight className="h-4 w-4" />,
}: BentoCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-background p-6",
        "hover:shadow-md transition-all duration-200",
        className
      )}
    >
      {background}
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5" />}
            <p className="font-medium">{name}</p>
          </div>
          {showActions && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-primary hover:text-white"
            >
              {actionIcon}
            </Button>
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
          {description}
        </p>
        {content}
        {actions ? (
          actions
        ) : (
          href && cta && (
            <div className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                className="group-hover:bg-primary group-hover:text-white transition-colors"
              >
                {cta}
              </Button>
            </div>
          )
        )}
      </div>
    </div>
  );
}