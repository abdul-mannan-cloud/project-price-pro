
import React from 'react';

export const EstimateAnimation = ({ className }: { className?: string }) => {
  return (
    <div className={`relative w-full flex items-center justify-center ${className || ''}`}>
      <div className="h-6 w-24 bg-gray-200 animate-pulse rounded relative overflow-hidden" />
    </div>
  );
};

