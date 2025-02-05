import React from 'react';
import { FileText, Sparkle } from 'lucide-react';

export const EstimateAnimation = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* File Icon Container */}
      <div className="relative">
        <FileText size={100} className="text-primary" />
        
        {/* Sparkle Animation */}
        <div className="absolute -top-2 -right-2 animate-[bounce_2s_infinite]">
          <Sparkle size={24} className="text-primary animate-pulse" />
        </div>
      </div>
    </div>
  );
};