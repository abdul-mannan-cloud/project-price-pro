
import React from 'react';
import { FileText, Sparkle } from 'lucide-react';
import { cn } from "@/lib/utils";

interface EstimateAnimationProps {
  className?: string;
}

export const EstimateAnimation: React.FC<EstimateAnimationProps> = ({ className }) => {
  return (
    <div className={cn("relative w-full h-full flex items-center justify-center", className)}>
      {/* File Icon Container */}
      <div className="relative">
        <FileText size={100} className="text-primary animate-pulse" />
        
        {/* Sparkle Animation */}
        {/*<div className="absolute -top-2 -right-2 animate-[bounce_2s_infinite]">*/}
        {/*  <Sparkle size={24} className="text-primary animate-pulse" />*/}
        {/*</div>*/}
      </div>
    </div>
  );
};
