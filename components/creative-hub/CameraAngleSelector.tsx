"use client";

import { useState } from "react";
import { X, Check, ChevronDown } from "lucide-react";
import { CameraAngle } from "@/services/creative-hub";
import { getCameraAngleDiagram } from "@/components/creative-hub/CameraAngleDiagram";

interface CameraAngleSelectorProps {
  angles: CameraAngle[];
  value: string;
  onChange: (name: string) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}

function AnglePreview({ angle, className }: { angle: CameraAngle; className?: string }) {
  if (angle.reference_image) {
    return (
      <img
        src={angle.reference_image}
        alt={angle.name}
        className={className ?? "w-full h-full object-cover"}
      />
    );
  }
  const diagram = getCameraAngleDiagram(angle.name);
  if (diagram) {
    return <div className={className ?? "w-full h-full"}>{diagram}</div>;
  }
  return (
    <div className="w-full h-full flex items-center justify-center">
      <span className="text-[#333] text-xs">{angle.name[0]}</span>
    </div>
  );
}

export default function CameraAngleSelector({
  angles,
  value,
  onChange,
  disabled = false,
  size = "md",
}: CameraAngleSelectorProps) {
  const [open, setOpen] = useState(false);
  const selected = angles.find((a) => a.name === value) ?? null;

  const triggerClass =
    size === "sm"
      ? "w-full bg-[#111] border border-[#222] rounded-md text-xs text-[#ccc] px-2 py-2 outline-none focus:border-emerald-500/40 flex items-center justify-between gap-1"
      : "w-full bg-[#0a0a0a] border border-[#222] rounded-md text-sm text-white px-3 py-2 outline-none focus:border-emerald-500/50 flex items-center justify-between gap-2";

  const thumbSize = size === "sm" ? "w-6 h-4" : "w-8 h-5";

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        type="button"
        className={triggerClass}
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
      >
        <span className="flex items-center gap-2 min-w-0">
          {selected && (
            <span className={`${thumbSize} rounded overflow-hidden flex-shrink-0 inline-flex`}>
              <AnglePreview angle={selected} className="w-full h-full object-cover" />
            </span>
          )}
          <span className="truncate">
            {selected ? selected.name : size === "sm" ? "—" : "— Select angle —"}
          </span>
        </span>
        <ChevronDown className={size === "sm" ? "w-3 h-3 flex-shrink-0 text-[#555]" : "w-4 h-4 flex-shrink-0 text-[#555]"} />
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative bg-[#0d0d0d] border border-[#222] rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a]">
              <span className="text-sm font-semibold text-white tracking-wide">
                Select Camera Angle
              </span>
              <button
                onClick={() => setOpen(false)}
                className="text-[#555] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Grid */}
            <div className="overflow-y-auto p-4">
              {angles.length === 0 ? (
                <p className="text-center text-[#555] text-sm py-8">Loading angles…</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {/* Clear / None option */}
                  <button
                    type="button"
                    onClick={() => { onChange(""); setOpen(false); }}
                    className={`relative rounded-lg border overflow-hidden flex flex-col items-center justify-center gap-2 p-3 h-28 transition-all ${
                      !value
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-[#222] bg-[#111] hover:border-[#333]"
                    }`}
                  >
                    <span className="text-[#555] text-2xl">—</span>
                    <span className="text-[10px] text-[#666] uppercase tracking-wider">None</span>
                    {!value && (
                      <Check className="absolute top-1.5 right-1.5 w-3 h-3 text-emerald-400" />
                    )}
                  </button>

                  {angles.map((angle) => (
                    <button
                      key={angle.id}
                      type="button"
                      onClick={() => { onChange(angle.name); setOpen(false); }}
                      className={`relative rounded-lg border overflow-hidden flex flex-col transition-all ${
                        value === angle.name
                          ? "border-emerald-500 ring-1 ring-emerald-500/40"
                          : "border-[#222] hover:border-[#333]"
                      }`}
                    >
                      {/* Preview — photo if available, diagram otherwise */}
                      <div className="w-full h-20 bg-[#111] flex-shrink-0 overflow-hidden">
                        <AnglePreview angle={angle} />
                      </div>

                      {/* Label */}
                      <div className="px-2 py-1.5 bg-[#0d0d0d] border-t border-[#1a1a1a]">
                        <span className="text-[10px] text-[#aaa] leading-tight block text-center">
                          {angle.name}
                        </span>
                        {angle.description && (
                          <span className="text-[9px] text-[#555] leading-tight block text-center mt-0.5 truncate">
                            {angle.description}
                          </span>
                        )}
                      </div>

                      {value === angle.name && (
                        <Check className="absolute top-1.5 right-1.5 w-3.5 h-3.5 text-emerald-400 drop-shadow-sm" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
