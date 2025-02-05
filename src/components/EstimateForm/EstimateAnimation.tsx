import React, { useEffect, useRef } from 'react';
import { FileText } from 'lucide-react';

export const EstimateAnimation = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* File Icon Container */}
      <div className="relative">
        <FileText size={100} className="text-primary" />
        
        {/* Scanning Line with Sparkles */}
        <div className="absolute left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-[scan_2s_ease-in-out_infinite]">
          {/* Sparkles */}
          <div className="absolute -top-1 left-1/4 w-1 h-1 bg-white rounded-full animate-ping" />
          <div className="absolute -top-1 left-2/4 w-1 h-1 bg-white rounded-full animate-ping [animation-delay:0.3s]" />
          <div className="absolute -top-1 left-3/4 w-1 h-1 bg-white rounded-full animate-ping [animation-delay:0.6s]" />
        </div>
      </div>
    </div>
  );
};