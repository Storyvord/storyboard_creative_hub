"use client";

import React from "react";
import { useTilt } from "@/hooks/useTilt";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  max?: number;
  scale?: number;
  children: React.ReactNode;
}

export default function TiltCard({ max, scale, className, children, ...rest }: Props) {
  const { ref, onMouseMove, onMouseLeave } = useTilt({ max, scale });
  return (
    <div
      ref={ref}
      className={`vf-tilt ${className ?? ""}`.trim()}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      {...rest}
    >
      {children}
    </div>
  );
}
