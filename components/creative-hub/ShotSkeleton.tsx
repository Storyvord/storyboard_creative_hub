import React from "react";

interface ShotSkeletonProps {
  count?: number;
  className?: string;
}

const ShotSkeleton = ({ count = 1, className = "w-56 flex-shrink-0" }: ShotSkeletonProps) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i}
          className={`flex flex-col border border-[#222] rounded-md overflow-hidden bg-[#111] relative ${className}`}
        >
          {/* Shimmer "Green Light" - now global to the card container */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent -translate-x-full animate-shimmer z-10 pointer-events-none" />
          
          {/* Image Area */}
          <div className="aspect-video bg-[#0a0a0a] border-b border-[#1a1a1a]" />
          
          {/* Metadata Row */}
          <div className="px-2.5 pt-2 pb-1 flex items-center gap-2">
            <div className="w-8 h-3 bg-[#1a1a1a] rounded opacity-50" />
            <div className="w-10 h-3.5 bg-emerald-500/5 rounded border border-emerald-500/10" />
            <div className="w-6 h-3 bg-[#1a1a1a] rounded opacity-30 ml-auto" />
          </div>
          
          {/* Select Row */}
          <div className="px-2.5 pb-1.5 flex items-center gap-1.5">
            <div className="h-5 bg-[#0a0a0a] border border-[#222] rounded flex-1" />
          </div>
          
          {/* Description Area */}
          <div className="px-2.5 pb-2.5 flex-1 space-y-1.5 mt-1">
             <div className="w-full h-2.5 bg-[#1a1a1a] rounded opacity-40" />
             <div className="w-4/5 h-2.5 bg-[#1a1a1a] rounded opacity-30" />
             <div className="w-2/3 h-2.5 bg-[#1a1a1a] rounded opacity-20" />
          </div>
        </div>
      ))}
    </>
  );
};

export default ShotSkeleton;
