"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronRight, ChevronLeft, HelpCircle } from "lucide-react";

export const TOUR_STORAGE_KEY = "storyboard_tour_v1_completed";

interface TourStep {
  id: string;
  title: string;
  content: string;
  target: string | null;
  position?: "top" | "bottom" | "left" | "right" | "bottom-left";
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Storyboard",
    content:
      "Visualize every shot of your film here. Scenes from your script appear as rows, each containing horizontally-scrollable shot cards. Let's take a quick walkthrough!",
    target: null,
  },
  {
    id: "aspect-ratio",
    title: "Aspect Ratio",
    content:
      "Sets the default frame dimensions for all AI-generated previz images. 16:9 is standard widescreen — change this to match your production format before generating.",
    target: "aspect-ratio",
    position: "bottom",
  },
  {
    id: "style",
    title: "Generation Style",
    content:
      "Choose how the AI renders each shot: Sketch for fast rough drafts, Storyboard for clean panel-style frames, HD for photorealistic images, or Anime for illustrated style.",
    target: "style",
    position: "bottom",
  },
  {
    id: "jump",
    title: "Jump to Scene",
    content:
      "Hover to reveal a dropdown of all scenes in your script. Click any scene to instantly scroll to it — even if it hasn't loaded yet (the page fetches it automatically).",
    target: "jump",
    position: "bottom",
  },
  {
    id: "select-all",
    title: "Select Scenes",
    content:
      "Select all scenes at once to unlock bulk AI generation. You can also check individual scenes using the checkbox on the left of each scene header. Once selected, Bulk Shots and Bulk Previz buttons appear.",
    target: "select-all",
    position: "bottom",
  },
  {
    id: "creative-space",
    title: "Creative Space",
    content:
      "Opens a freeform canvas for mood boards, reference images, and visual exploration that lives alongside your storyboard.",
    target: "creative-space",
    position: "bottom-left",
  },
  {
    id: "slideshow",
    title: "Slideshow",
    content:
      "Play all generated shot images as a fullscreen slideshow. Select specific scenes or individual shots first to play only those in the presentation.",
    target: "slideshow",
    position: "bottom-left",
  },
  {
    id: "scene-row",
    title: "Scene Row",
    content:
      "Each row is one scene from your script. The header shows the scene number (SC 01), INT/EXT flag, location, and time of day. Click the checkbox on the left to select it for bulk operations.",
    target: "scene-row",
    position: "bottom",
  },
  {
    id: "shots-area",
    title: "Shot Cards",
    content:
      "Shots scroll horizontally. Each card shows the previz image, shot type abbreviation (CU, WS, MS…), and an editable description. Click a card's image to open its detail panel. Drag the ⠿ grip to reorder. Hover between cards to reveal a + insert button. The dashed card at the end manually adds a new shot.",
    target: "shots-area",
    position: "top",
  },
];

const PAD = 10; // px padding around the highlighted element
const TOOLTIP_W = 320;
const TOOLTIP_H = 200; // approximate, for initial placement

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Props {
  onComplete: () => void;
}

export default function StoryboardTour({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentStep = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  const computeLayout = useCallback(() => {
    if (!currentStep.target) {
      setSpotlightRect(null);
      setTooltipStyle({
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      });
      return;
    }

    const el = document.querySelector(
      `[data-tour="${currentStep.target}"]`
    ) as HTMLElement | null;

    if (!el) {
      setSpotlightRect(null);
      setTooltipStyle({
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      });
      return;
    }

    const r = el.getBoundingClientRect();
    const sp: SpotlightRect = {
      top: r.top - PAD,
      left: r.left - PAD,
      width: r.width + PAD * 2,
      height: r.height + PAD * 2,
    };
    setSpotlightRect(sp);

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 14;
    const pos = currentStep.position ?? "bottom";

    let top: number;
    let left: number | undefined;
    let right: number | undefined;

    switch (pos) {
      case "top":
        top = sp.top - TOOLTIP_H - margin;
        left = Math.min(
          Math.max(sp.left + sp.width / 2 - TOOLTIP_W / 2, 12),
          vw - TOOLTIP_W - 12
        );
        break;
      case "left":
        top = Math.min(
          Math.max(sp.top + sp.height / 2 - TOOLTIP_H / 2, 12),
          vh - TOOLTIP_H - 12
        );
        left = Math.max(sp.left - TOOLTIP_W - margin, 12);
        break;
      case "right":
        top = Math.min(
          Math.max(sp.top + sp.height / 2 - TOOLTIP_H / 2, 12),
          vh - TOOLTIP_H - 12
        );
        left = Math.min(sp.left + sp.width + margin, vw - TOOLTIP_W - 12);
        break;
      case "bottom-left":
        top = sp.top + sp.height + margin;
        right = vw - (sp.left + sp.width);
        left = undefined;
        break;
      default: // "bottom"
        top = sp.top + sp.height + margin;
        left = Math.min(
          Math.max(sp.left + sp.width / 2 - TOOLTIP_W / 2, 12),
          vw - TOOLTIP_W - 12
        );
        break;
    }

    // Clamp top to viewport
    top = Math.min(Math.max(top, 12), vh - TOOLTIP_H - 12);

    const style: React.CSSProperties = { position: "fixed", top };
    if (right !== undefined) style.right = right;
    else if (left !== undefined) style.left = left;
    setTooltipStyle(style);
  }, [currentStep]);

  useEffect(() => {
    // Scroll target into view first, then compute layout
    if (currentStep.target) {
      const el = document.querySelector(
        `[data-tour="${currentStep.target}"]`
      ) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        // Small delay so scroll settles before measuring
        const t = setTimeout(computeLayout, 120);
        return () => clearTimeout(t);
      }
    }
    computeLayout();
  }, [step, computeLayout, currentStep.target]);

  useEffect(() => {
    window.addEventListener("resize", computeLayout);
    return () => window.removeEventListener("resize", computeLayout);
  }, [computeLayout]);

  const handleComplete = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    onComplete();
  };

  const handleNext = () => (isLast ? handleComplete() : setStep((s) => s + 1));
  const handlePrev = () => step > 0 && setStep((s) => s - 1);

  return (
    <>
      {/* ── Overlay / Spotlight ── */}
      {spotlightRect ? (
        <>
          {/* top strip */}
          <div
            className="fixed inset-x-0 top-0 bg-black/75 z-[9998] pointer-events-none"
            style={{ height: spotlightRect.top }}
          />
          {/* bottom strip */}
          <div
            className="fixed inset-x-0 bottom-0 bg-black/75 z-[9998] pointer-events-none"
            style={{ top: spotlightRect.top + spotlightRect.height }}
          />
          {/* left strip */}
          <div
            className="fixed bg-black/75 z-[9998] pointer-events-none"
            style={{
              top: spotlightRect.top,
              left: 0,
              width: spotlightRect.left,
              height: spotlightRect.height,
            }}
          />
          {/* right strip */}
          <div
            className="fixed bg-black/75 z-[9998] pointer-events-none"
            style={{
              top: spotlightRect.top,
              left: spotlightRect.left + spotlightRect.width,
              right: 0,
              height: spotlightRect.height,
            }}
          />
          {/* glowing border ring around the target */}
          <div
            className="fixed z-[9999] rounded-lg border-2 border-emerald-400/70 shadow-[0_0_24px_rgba(52,211,153,0.35)] pointer-events-none transition-all duration-300"
            style={{
              top: spotlightRect.top,
              left: spotlightRect.left,
              width: spotlightRect.width,
              height: spotlightRect.height,
            }}
          />
        </>
      ) : (
        <div className="fixed inset-0 bg-black/75 z-[9998] pointer-events-none" />
      )}

      {/* Click-blocker (prevents interaction with background content) */}
      <div className="fixed inset-0 z-[9997]" onClick={(e) => e.stopPropagation()} />

      {/* ── Tooltip Card ── */}
      <div
        ref={tooltipRef}
        style={{ ...tooltipStyle, width: TOOLTIP_W }}
        className="fixed z-[10000] bg-[#0f0f0f] border border-[#2c2c2c] rounded-2xl shadow-2xl p-5 select-none"
      >
        {/* Progress dots */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === step
                    ? "w-4 h-1.5 bg-emerald-400"
                    : i < step
                    ? "w-1.5 h-1.5 bg-emerald-700"
                    : "w-1.5 h-1.5 bg-[#2a2a2a]"
                }`}
              />
            ))}
          </div>
          <button
            onClick={handleComplete}
            className="text-[#444] hover:text-[#888] transition-colors rounded-md p-0.5"
            aria-label="Close tour"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Step counter */}
        <p className="text-[9px] font-mono text-[#555] uppercase tracking-widest mb-1.5">
          Step {step + 1} of {TOUR_STEPS.length}
        </p>

        <h3 className="text-sm font-semibold text-white mb-2 leading-snug">
          {currentStep.title}
        </h3>
        <p className="text-[12px] text-[#888] leading-relaxed mb-5">
          {currentStep.content}
        </p>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleComplete}
            className="text-[10px] text-[#555] hover:text-[#777] transition-colors"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] text-[#777] hover:text-white border border-[#222] hover:border-[#333] rounded-lg transition-colors"
              >
                <ChevronLeft className="w-3 h-3" />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-medium"
            >
              {isLast ? "Finish" : "Next"}
              {!isLast && <ChevronRight className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/** Small "?" button that re-triggers the tour. */
export function TourTriggerButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Show tour guide"
      className="flex items-center justify-center w-7 h-7 rounded-md border border-[#222] bg-[#161616] hover:bg-[#1e1e1e] text-[#555] hover:text-emerald-400 transition-colors"
    >
      <HelpCircle className="w-3.5 h-3.5" />
    </button>
  );
}
