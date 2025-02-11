
import React from 'react';
import { Sparkle } from 'lucide-react';

export const EstimateAnimation = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="relative">
        <div className="animate-[bounce_2s_infinite]">
          <Sparkle size={24} className="text-primary animate-pulse" />
        </div>
      </div>
    </div>
  );
};

