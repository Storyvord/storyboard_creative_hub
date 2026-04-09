"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  const [imgFailed, setImgFailed] = useState(false);
  const diagram = getCameraAngleDiagram(angle.name);

  if (angle.reference_image && !imgFailed) {
    return (
      <img
        src={angle.reference_image}
        alt={angle.name}
        className={className ?? "w-full h-full object-cover"}
        onError={() => setImgFailed(true)}
      />
    );
  }
  if (diagram) {
    return <div className={className ?? "w-full h-full"}>{diagram}</div>;
  }
  return (
    <div className="w-full h-full flex items-center justify-center">
      <span className="text-[#333] text-xs">{angle.name[0]}</span>
    </div>
  );
}

// Smooth ease — long tail so the expansion feels organic
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const EXPAND_DURATION = 0.9;
const COLLAPSE_DURATION = 0.75;

export default function CameraAngleSelector({
  angles,
  value,
  onChange,
  disabled = false,
  size = "md",
}: CameraAngleSelectorProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = angles.find((a) => a.name === value) ?? null;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleOpen = () => {
    if (disabled) return;
    const r = triggerRef.current?.getBoundingClientRect();
    if (r) setTriggerRect(r);
    setOpen(true);
  };

  const handleSelect = (name: string) => {
    onChange(name);   // update value immediately so trigger shows selection
    setOpen(false);   // kick off collapse animation back to (now-updated) trigger
  };

  // Compute expanded panel rect — centred in viewport
  const getExpandedRect = () => {
    if (typeof window === "undefined") return { left: 0, top: 0, width: 640, height: 520 };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(672, vw - 32);
    const h = Math.min(vh * 0.82, 560);
    return { left: (vw - w) / 2, top: (vh - h) / 2, width: w, height: h };
  };

  const collapsed = triggerRect
    ? { left: triggerRect.left, top: triggerRect.top, width: triggerRect.width, height: triggerRect.height, borderRadius: 6 }
    : getExpandedRect();

  const expanded = { ...getExpandedRect(), borderRadius: 12 };

  const triggerClass =
    size === "sm"
      ? "w-full bg-[#111] border border-[#222] rounded-md text-xs text-[#ccc] px-2 py-2 outline-none focus:border-emerald-500/40 flex items-center justify-between gap-1"
      : "w-full bg-[#0a0a0a] border border-[#222] rounded-md text-sm text-white px-3 py-2 outline-none focus:border-emerald-500/50 flex items-center justify-between gap-2";

  const thumbSize = size === "sm" ? "w-6 h-4" : "w-8 h-5";

  const portal = (
    <AnimatePresence>
      {open && triggerRect && (
        <>
          {/* Backdrop */}
          <motion.div
            key="cas-backdrop"
            className="fixed inset-0 bg-black/60"
            style={{ zIndex: 9998 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setOpen(false)}
          />

          {/* Panel — morphs from trigger rect to centred modal */}
          <motion.div
            key="cas-panel"
            className="fixed overflow-hidden flex flex-col bg-[#0d0d0d] border border-[#222] shadow-2xl"
            style={{ zIndex: 9999 }}
            initial={collapsed}
            animate={expanded}
            exit={collapsed}
            transition={{ duration: open ? EXPAND_DURATION : COLLAPSE_DURATION, ease: EASE_OUT_EXPO }}
          >
            {/* Header — fades in after panel has mostly expanded */}
            <motion.div
              className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a] flex-shrink-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, delay: open ? EXPAND_DURATION * 0.55 : 0, ease: "easeOut" }}
            >
              <span className="text-sm font-semibold text-white tracking-wide">Select Camera Angle</span>
              <button onClick={() => setOpen(false)} className="text-[#555] hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </motion.div>

            {/* Grid — fades in slightly after header */}
            <motion.div
              className="overflow-y-auto p-4 flex-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, delay: open ? EXPAND_DURATION * 0.62 : 0, ease: "easeOut" }}
            >
              {angles.length === 0 ? (
                <p className="text-center text-[#555] text-sm py-8">Loading angles…</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {/* None */}
                  <button
                    type="button"
                    onClick={() => handleSelect("")}
                    className={`relative rounded-lg border overflow-hidden flex flex-col items-center justify-center gap-2 p-3 h-28 transition-all ${
                      !value ? "border-emerald-500 bg-emerald-500/10" : "border-[#222] bg-[#111] hover:border-[#333]"
                    }`}
                  >
                    <span className="text-[#555] text-2xl">—</span>
                    <span className="text-[10px] text-[#666] uppercase tracking-wider">None</span>
                    {!value && <Check className="absolute top-1.5 right-1.5 w-3 h-3 text-emerald-400" />}
                  </button>

                  {angles.map((angle) => (
                    <button
                      key={angle.id}
                      type="button"
                      onClick={() => handleSelect(angle.name)}
                      className={`relative rounded-lg border overflow-hidden flex flex-col transition-all ${
                        value === angle.name
                          ? "border-emerald-500 ring-1 ring-emerald-500/40"
                          : "border-[#222] hover:border-[#333]"
                      }`}
                    >
                      <div className="w-full h-20 bg-[#111] flex-shrink-0 overflow-hidden">
                        <AnglePreview angle={angle} />
                      </div>
                      <div className="px-2 py-1.5 bg-[#0d0d0d] border-t border-[#1a1a1a]">
                        <span className="text-[10px] text-[#aaa] leading-tight block text-center">{angle.name}</span>
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
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        className={triggerClass}
        onClick={handleOpen}
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
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
          className="flex-shrink-0"
        >
          <ChevronDown className={size === "sm" ? "w-3 h-3 text-[#555]" : "w-4 h-4 text-[#555]"} />
        </motion.span>
      </button>

      {mounted && createPortal(portal, document.body)}
    </div>
  );
}
