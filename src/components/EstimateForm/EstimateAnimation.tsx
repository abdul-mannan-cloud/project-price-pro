import React, { useEffect, useRef } from 'react';
import { FileText } from 'lucide-react';

export const EstimateAnimation = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* File Icon Container */}
      <div className="relative">
        <FileText size={100} className="text-primary" />
        
        {/* Scanning Line with Sparkles - Now more visible and properly positioned */}
        <div className="absolute inset-x-[-20%] w-[140%] h-1.5 bg-gradient-to-r from-transparent via-primary/80 to-transparent animate-[scan_2s_ease-in-out_infinite]">
          {/* Sparkles */}
          <div className="absolute -top-1 left-1/4 w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
          <div className="absolute -top-1 left-2/4 w-1.5 h-1.5 bg-primary rounded-full animate-ping [animation-delay:0.3s]" />
          <div className="absolute -top-1 left-3/4 w-1.5 h-1.5 bg-primary rounded-full animate-ping [animation-delay:0.6s]" />
        </div>
      </div>
    </div>
  );
};