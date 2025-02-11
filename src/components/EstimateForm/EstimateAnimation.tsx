
import React from 'react';

export const EstimateAnimation = ({ className, height = "h-6", width = "w-24" }: { 
  className?: string;
  height?: string;
  width?: string;
}) => {
  return (
    <div className={`relative w-full flex items-center justify-center ${className || ''}`}>
      <div className={`${height} ${width} bg-gray-200 animate-pulse rounded relative overflow-hidden`} />
    </div>
  );
};

