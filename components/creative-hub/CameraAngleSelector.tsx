"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  if (diagram) return <div className={className ?? "w-full h-full"}>{diagram}</div>;
  return (
    <div className="w-full h-full flex items-center justify-center">
      <span className="text-[var(--text-muted)] text-xs">{angle.name[0]}</span>
    </div>
  );
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const EXPAND_DUR  = 0.9;   // seconds
const COLLAPSE_DUR = 0.75;  // seconds

export default function CameraAngleSelector({
  angles,
  value,
  onChange,
  disabled = false,
  size = "md",
}: CameraAngleSelectorProps) {
  const [mounted, setMounted]       = useState(false);
  const [visible, setVisible]       = useState(false);   // panel is in DOM
  const [phase, setPhase]           = useState<"expand" | "open" | "collapse">("expand");
  const [pendingAngle, setPending]  = useState<CameraAngle | null>(null);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
  const triggerRef  = useRef<HTMLButtonElement>(null);
  const closeTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = angles.find((a) => a.name === value) ?? null;

  useEffect(() => { setMounted(true); }, []);

  // cleanup timer on unmount
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  // body scroll lock
  useEffect(() => {
    document.body.style.overflow = visible ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [visible]);

  const getExpanded = useCallback(() => {
    if (typeof window === "undefined") return { left: 0, top: 0, width: 640, height: 520, borderRadius: 12 };
    const w = Math.min(672, window.innerWidth - 32);
    const h = Math.min(window.innerHeight * 0.82, 560);
    return { left: (window.innerWidth - w) / 2, top: (window.innerHeight - h) / 2, width: w, height: h, borderRadius: 12 };
  }, []);

  const getCollapsed = useCallback(() => {
    if (!triggerRect) return getExpanded();
    return { left: triggerRect.left, top: triggerRect.top, width: triggerRect.width, height: triggerRect.height, borderRadius: 6 };
  }, [triggerRect, getExpanded]);

  // ── Open ──────────────────────────────────────────────────────────────────
  const handleOpen = () => {
    if (disabled) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    const r = triggerRef.current?.getBoundingClientRect();
    if (r) setTriggerRect(r);
    setPending(null);
    setPhase("expand");
    setVisible(true);
    // Brief delay so "expand" initial state renders before animating to "open"
    requestAnimationFrame(() => requestAnimationFrame(() => setPhase("open")));
  };

  // ── Collapse helper ───────────────────────────────────────────────────────
  const startCollapse = (selectedAngle: CameraAngle | null) => {
    setPending(selectedAngle);
    setPhase("collapse");
    closeTimer.current = setTimeout(() => {
      setVisible(false);
      setPending(null);
      setPhase("expand"); // reset for next open
    }, COLLAPSE_DUR * 1000 + 80);
  };

  // ── Select ────────────────────────────────────────────────────────────────
  const handleSelect = (name: string) => {
    onChange(name);
    const angle = angles.find((a) => a.name === name) ?? null;
    startCollapse(angle);
  };

  // ── Dismiss (backdrop / × button) ────────────────────────────────────────
  const handleDismiss = () => startCollapse(null);

  // ── Derived animation target ──────────────────────────────────────────────
  const panelAnimate = phase === "open" ? getExpanded() : getCollapsed();

  const triggerCls =
    size === "sm"
      ? "w-full bg-[var(--surface)] border border-[var(--border)] rounded-md text-xs text-[#ccc] px-2 py-2 outline-none focus:border-emerald-500/40 flex items-center justify-between gap-1"
      : "w-full bg-[var(--background)] border border-[var(--border)] rounded-md text-sm text-white px-3 py-2 outline-none focus:border-emerald-500/50 flex items-center justify-between gap-2";

  const thumbSize = size === "sm" ? "w-6 h-4" : "w-8 h-5";

  const portal = visible && triggerRect ? (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/60"
        style={{ zIndex: 9998 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "open" ? 1 : 0 }}
        transition={{ duration: phase === "open" ? 0.3 : 0.2 }}
        onClick={handleDismiss}
      />

      {/* Panel — driven entirely by `animate`, no exit */}
      <motion.div
        className="fixed overflow-hidden flex flex-col bg-[var(--surface)] border border-[var(--border)] shadow-2xl"
        style={{ zIndex: 9999 }}
        initial={getCollapsed()}
        animate={panelAnimate}
        transition={{
          duration: phase === "collapse" ? COLLAPSE_DUR : EXPAND_DUR,
          ease: EASE,
        }}
      >
        {/* ── OPEN: header + grid ── */}
        <AnimatePresence>
          {phase === "open" && (
            <motion.div
              key="grid"
              className="flex flex-col flex-1 overflow-hidden min-h-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              {/* Header */}
              <motion.div
                className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25, delay: EXPAND_DUR * 0.55 }}
              >
                <span className="text-sm font-semibold text-[var(--text-primary)] tracking-wide">Select Camera Angle</span>
                <button onClick={handleDismiss} className="text-[var(--text-muted)] hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>

              {/* Grid */}
              <motion.div
                className="overflow-y-auto p-4 flex-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: EXPAND_DUR * 0.62 }}
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {/* None */}
                  <button
                    type="button"
                    onClick={() => handleSelect("")}
                    className={`relative rounded-lg border overflow-hidden flex flex-col items-center justify-center gap-2 p-3 h-28 transition-all ${
                      !value ? "border-emerald-500 bg-emerald-500/10" : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-hover)]"
                    }`}
                  >
                    <span className="text-[var(--text-muted)] text-2xl">—</span>
                    <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">None</span>
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
                          : "border-[var(--border)] hover:border-[var(--border-hover)]"
                      }`}
                    >
                      <div className="w-full h-20 bg-[var(--surface)] flex-shrink-0 overflow-hidden">
                        <AnglePreview angle={angle} />
                      </div>
                      <div className="px-2 py-1.5 bg-[var(--surface)] border-t border-[var(--border)]">
                        <span className="text-[10px] text-[var(--text-secondary)] leading-tight block text-center">{angle.name}</span>
                        {angle.description && (
                          <span className="text-[9px] text-[var(--text-muted)] leading-tight block text-center mt-0.5 truncate">
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
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── COLLAPSE: only selected angle shrinks into trigger ── */}
        <AnimatePresence>
          {phase === "collapse" && pendingAngle && (
            <motion.div
              key="collapsing-preview"
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: COLLAPSE_DUR * 0.5, delay: COLLAPSE_DUR * 0.4, ease: "easeIn" }}
            >
              <motion.div
                className="rounded overflow-hidden"
                initial={{ width: 140, height: 88 }}
                animate={{ width: size === "sm" ? 24 : 32, height: size === "sm" ? 16 : 20 }}
                transition={{ duration: COLLAPSE_DUR * 0.9, ease: EASE }}
              >
                <AnglePreview angle={pendingAngle} className="w-full h-full object-cover" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  ) : null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        className={triggerCls}
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
          animate={{ rotate: phase === "open" ? 180 : 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="flex-shrink-0"
        >
          <ChevronDown className={size === "sm" ? "w-3 h-3 text-[var(--text-muted)]" : "w-4 h-4 text-[var(--text-muted)]"} />
        </motion.span>
      </button>

      {mounted && createPortal(portal, document.body)}
    </div>
  );
}
