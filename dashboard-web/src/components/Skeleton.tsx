import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = 'h-6 w-full' }) => {
  return (
    <div className={`bg-slate-800/60 animate-pulse rounded-xl ${className}`} />
  );
};
