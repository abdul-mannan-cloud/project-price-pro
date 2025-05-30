import React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
}

interface BentoCardProps {
  name: string;
  description: string;
  Icon: React.ComponentType<any>;
  href: string;
  cta: string;
  className?: string;
  background?: React.ReactNode;
  actions?: React.ReactNode;
  content?: React.ReactNode;
  onClick?: () => void;
  showActions?: boolean;
  actionIcon?: React.ReactNode;
}

const BentoGrid = ({ children, className }: BentoGridProps) => {
  return (
    <div className={cn("grid w-full auto-rows-[22rem] grid-cols-3 gap-4", className)}>
      {children}
    </div>
  );
};

const BentoCard = ({ 
  name, 
  className, 
  background, 
  Icon, 
  description, 
  href, 
  cta,
  actions,
  content,
  onClick,
  showActions,
  actionIcon
}: BentoCardProps) => {
  const isPrimary = className?.includes('bg-primary');
  
  return (
    <div
      key={name}
      onClick={onClick}
      className={cn(
        "group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl cursor-pointer",
        "bg-white [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
        "transform-gpu dark:bg-black dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]",
        className
      )}
    >
      <div>{background}</div>
      <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 p-6 transition-all duration-300 group-hover:-translate-y-10">
        <div className="flex justify-between items-start">
          <Icon className={cn(
            "h-12 w-12 origin-left transform-gpu transition-all duration-300 ease-in-out group-hover:scale-75",
            isPrimary ? "text-white" : "text-neutral-700"
          )} />
          {showActions && actionIcon && (
            <div className="text-neutral-400">{actionIcon}</div>
          )}
        </div>
        <h3 className={cn(
          "text-xl font-semibold",
          isPrimary ? "text-white" : "text-neutral-700 dark:text-neutral-300"
        )}>
          {name}
        </h3>
        <p className={cn(
          "max-w-lg",
          isPrimary ? "text-white/90" : "text-neutral-400"
        )}>
          {description}
        </p>
        {content}
        {actions}
      </div>
      {!showActions && (
        <div
          className={cn(
            "pointer-events-none absolute bottom-0 flex w-full translate-y-10 transform-gpu flex-row items-center p-4",
            "opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
          )}
        >
          <Button 
            variant={isPrimary ? "secondary" : "ghost"} 
            asChild 
            size="sm" 
            className={cn(
              "pointer-events-auto",
              isPrimary ? "text-primary hover:text-primary-foreground hover:bg-white/90" : ""
            )}
          >
            <a href={href}>
              {cta}
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/[.03] group-hover:dark:bg-neutral-800/10" />
    </div>
  );
};

export { BentoCard, BentoGrid };