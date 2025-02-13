
import React from 'react';

export const EstimateAnimation = ({ className = '', height = "h-full", width = "w-full" }: { 
  className?: string;
  height?: string;
  width?: string;
}) => {
  return (
    <div className={`relative ${height} ${width} overflow-hidden ${className}`}>
      <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white to-transparent" />
    </div>
  );
};
