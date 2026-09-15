import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = 'h-6 w-full' }) => {
  return (
    <div className={`bg-[#2c2d2e] border border-[#1e1e1f] shadow-[inset_1px_1px_0_#38393a] animate-pulse ${className}`} />
  );
};
