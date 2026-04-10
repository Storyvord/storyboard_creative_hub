"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X, ChevronRight, ChevronLeft, HelpCircle } from "lucide-react";

export const PLATFORM_TOUR_DONE_KEY = "platform_tour_v1_done";
export const PLATFORM_TOUR_PAGE_KEY = "platform_tour_v1_page";

// ─── Page ordering ───────────────────────────────────────────────────────────
const PAGE_ORDER = ["script", "scenes", "characters", "locations", "wardrobe"];

const PAGE_ROUTE_FRAGMENT: Record<string, string> = {
  script: "/creative-hub/script",
  scenes: "/creative-hub/scenes",
  characters: "/creative-hub/characters",
  locations: "/creative-hub/locations",
  wardrobe: "/creative-hub/wardrobe",
};

function getCurrentPage(pathname: string): string {
  for (const [key, frag] of Object.entries(PAGE_ROUTE_FRAGMENT)) {
    if (pathname.includes(frag)) return key;
  }
  return "";
}

// ─── Step definitions ─────────────────────────────────────────────────────────
interface TourStep {
  id: string;
  page: string;
  title: string;
  content: string;
  target: string | null;
  position?: "top" | "bottom" | "left" | "right" | "bottom-left";
}

const TOUR_STEPS: TourStep[] = [
  // ── Script ──────────────────────────────────────────────
  {
    id: "hub-welcome",
    page: "script",
    title: "Welcome to Creative Hub",
    content:
      "Your complete filmmaking workspace. Upload a screenplay, then the platform automatically extracts scenes, characters, and locations — each with AI-powered image generation. The workflow: Script → Scenes → Characters → Locations → Wardrobe → Storyboard.",
    target: null,
  },
  {
    id: "sidebar",
    page: "script",
    title: "Navigation",
    content:
      "Use the sidebar to move between sections. Each section builds on the one before — start with the Script and work your way down.",
    target: "sidebar-nav",
    position: "right",
  },
  {
    id: "script-upload",
    page: "script",
    title: "Upload Your Screenplay",
    content:
      "Click 'Select File' to upload your screenplay. Supported formats: .fdx, .pdf, .docx, .doc, .rtf, .txt. Final Draft (.fdx) files load instantly — all others are automatically converted by AI.",
    target: "script-upload-zone",
    position: "top",
  },
  {
    id: "script-convert",
    page: "script",
    title: "AI Conversion & Review",
    content:
      "Non-FDX files go through an AI conversion pipeline (30–90 seconds). A confirmation banner then appears — review the generated screenplay, make any edits, and hit 'Confirm Script' to save it and extract scenes & characters.",
    target: null,
  },
  {
    id: "script-editor",
    page: "script",
    title: "Screenplay Editor",
    content:
      "A full-featured screenplay editor with proper formatting. Lines are classified as Scene Heading, Action, Character, Dialogue, etc. Use ⌘S to save, Tab to cycle element type, and ⌘1–7 to set a specific element.",
    target: "script-editor",
    position: "left",
  },
  {
    id: "script-nav",
    page: "script",
    title: "Scene Navigator",
    content:
      "The right panel lists all scene headings in your script. Click any heading to jump directly to that scene in the editor — essential for long scripts.",
    target: "scene-navigator",
    position: "left",
  },
  {
    id: "script-actions",
    page: "script",
    title: "Save & Analytics",
    content:
      "Save (⌘S) persists your edits back to FDX format. The Analytics button shows character appearance frequency, scene counts, INT vs EXT breakdown, and dialogue distribution charts.",
    target: "script-save-btn",
    position: "bottom-left",
  },

  // ── Scenes ──────────────────────────────────────────────
  {
    id: "scenes-intro",
    page: "scenes",
    title: "Scenes",
    content:
      "Scenes are parsed from your script and stored as structured records — scene name, INT/EXT flag, location, time of day, and description. They become the backbone of your storyboard and shot lists.",
    target: null,
  },
  {
    id: "scenes-sync",
    page: "scenes",
    title: "Sync Scenes",
    content:
      "Click 'Sync Scenes' to extract all scenes from your script. After editing the script, 'Re-sync' detects what's changed (new, edited, or deleted scenes) and shows a preview before you apply the changes.",
    target: "sync-scenes-btn",
    position: "bottom-left",
  },
  {
    id: "scenes-cards",
    page: "scenes",
    title: "Scene Cards",
    content:
      "Each card shows the scene number, name, INT/EXT, location, and sync status. Color-coded borders highlight changes: orange = edited, red = scheduled for deletion. Click a card to open the scene detail — manage characters, shots, and annotations per scene.",
    target: "scene-card",
    position: "bottom",
  },

  // ── Characters ──────────────────────────────────────────
  {
    id: "chars-intro",
    page: "characters",
    title: "Characters",
    content:
      "Your entire cast is automatically extracted when you sync scenes. Characters here are the BASE reference portraits — the canonical look of each person, independent of any specific scene.",
    target: null,
  },
  {
    id: "chars-vs-scene",
    page: "characters",
    title: "Characters vs Scene Characters",
    content:
      "Characters (this page) = global reference portraits.\n\nScene Characters (inside each scene's detail view) = how that character looks in ONE specific scene — different costume, an injury, different hairstyle, aging makeup, etc.\n\nThe same character can look completely different across scenes. You'll customize those scene-specific looks using the Fitting Room inside each scene.",
    target: "characters-vs-scene-info",
    position: "bottom",
  },
  {
    id: "chars-generate",
    page: "characters",
    title: "Add Description Before Generating",
    content:
      "Add a detailed description before generating a portrait: hair color, age, build, facial features, nationality, distinctive marks. The more detail you provide, the more accurate the AI portrait. You can also upload your own reference photo instead.",
    target: "add-character-btn",
    position: "bottom-left",
  },
  {
    id: "chars-card",
    page: "characters",
    title: "Character Cards",
    content:
      "Each card shows the portrait (or initials if no image), name, and description. Hover to reveal Edit and Delete. Click 'View Details' to open the editor where you can update the description and regenerate using a different AI model.",
    target: "character-card",
    position: "bottom",
  },

  // ── Locations ──────────────────────────────────────────
  {
    id: "locs-intro",
    page: "locations",
    title: "Locations",
    content:
      "Locations are automatically extracted from your scene headings. Add a description — time period, atmosphere, architectural style, lighting — then generate a reference image to use as a visual guide during production.",
    target: null,
  },
  {
    id: "locs-generate",
    page: "locations",
    title: "Generate Location Images",
    content:
      "Hover a location card and click the wand (✦) icon to generate a reference image. A model selector lets you choose between AI providers with different quality and credit cost tradeoffs. Add a description first for the best results.",
    target: "location-card",
    position: "bottom",
  },

  // ── Wardrobe ────────────────────────────────────────────
  {
    id: "wardrobe-intro",
    page: "wardrobe",
    title: "Wardrobe",
    content:
      "Build your wardrobe library — costumes, props, and accessories organized by clothing type. Items here are assigned to characters in the Scene Character Fitting Room to create scene-specific looks.",
    target: null,
  },
  {
    id: "wardrobe-fitting",
    page: "wardrobe",
    title: "Fitting Room",
    content:
      "The Fitting Room lets you preview different clothing combinations on a character — great for planning wardrobe before assigning outfits to specific scenes.",
    target: "fitting-room-btn",
    position: "bottom-left",
  },
  {
    id: "wardrobe-add",
    page: "wardrobe",
    title: "Add Wardrobe Items",
    content:
      "Click 'Add Item' to create a wardrobe entry with a name, type (torso, legs, head, accessories, full body…), and description. You can generate or upload a reference image for each item.",
    target: "add-wardrobe-item-btn",
    position: "bottom-left",
  },
  {
    id: "wardrobe-done",
    page: "wardrobe",
    title: "One More Section: Storyboard",
    content:
      "You've toured the core Creative Hub. The Storyboard section is where it all comes together visually — scenes become rows of shot cards, and you can generate AI previz images for each shot. A dedicated walkthrough will greet you there.",
    target: null,
  },
];

// ─── Layout constants ─────────────────────────────────────────────────────────
const PAD = 10;
const TOOLTIP_W = 340;
const TOOLTIP_H = 220;

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  projectId: string;
  onDone: () => void;
}

export default function PlatformTour({ projectId, onDone }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const currentPage = getCurrentPage(pathname);

  const pageSteps = TOUR_STEPS.filter((s) => s.page === currentPage);
  const [step, setStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentStep = pageSteps[step] ?? pageSteps[0];
  const isLastStep = step === pageSteps.length - 1;
  const nextPageKey = PAGE_ORDER[PAGE_ORDER.indexOf(currentPage) + 1] ?? null;

  // Reset step when navigating to a new page
  useEffect(() => {
    setStep(0);
  }, [currentPage]);

  const computeLayout = useCallback(() => {
    if (!currentStep?.target) {
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
    let top = 0;
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
        break;
      default: // bottom
        top = sp.top + sp.height + margin;
        left = Math.min(
          Math.max(sp.left + sp.width / 2 - TOOLTIP_W / 2, 12),
          vw - TOOLTIP_W - 12
        );
        break;
    }

    top = Math.min(Math.max(top, 12), vh - TOOLTIP_H - 12);

    const style: React.CSSProperties = { position: "fixed", top };
    if (right !== undefined) style.right = right;
    else if (left !== undefined) style.left = left;
    setTooltipStyle(style);
  }, [currentStep]);

  useEffect(() => {
    if (currentStep?.target) {
      const el = document.querySelector(
        `[data-tour="${currentStep.target}"]`
      ) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        const t = setTimeout(computeLayout, 120);
        return () => clearTimeout(t);
      }
    }
    computeLayout();
  }, [step, computeLayout, currentStep]);

  useEffect(() => {
    window.addEventListener("resize", computeLayout);
    return () => window.removeEventListener("resize", computeLayout);
  }, [computeLayout]);

  // Don't render if no steps for current page
  if (!currentStep || pageSteps.length === 0) return null;

  const handleSkip = () => {
    localStorage.setItem(PLATFORM_TOUR_DONE_KEY, "true");
    onDone();
  };

  const handleNextPage = () => {
    if (nextPageKey) {
      localStorage.setItem(PLATFORM_TOUR_PAGE_KEY, nextPageKey);
      router.push(`/projects/${projectId}/creative-hub/${nextPageKey}`);
    } else {
      // Wardrobe → storyboard (storyboard has its own tour)
      localStorage.setItem(PLATFORM_TOUR_DONE_KEY, "true");
      onDone();
      router.push(`/projects/${projectId}/creative-hub/storyboard`);
    }
  };

  const handleNext = () => {
    if (isLastStep) handleNextPage();
    else setStep((s) => s + 1);
  };

  const handlePrev = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const currentPageIdx = PAGE_ORDER.indexOf(currentPage);
  const nextPageLabel = nextPageKey
    ? nextPageKey.charAt(0).toUpperCase() + nextPageKey.slice(1)
    : "Storyboard";

  return (
    <>
      {/* ── Spotlight overlays ───────────────────────── */}
      {spotlightRect ? (
        <>
          <div
            className="fixed inset-x-0 top-0 bg-black/75 z-[9998] pointer-events-none"
            style={{ height: spotlightRect.top }}
          />
          <div
            className="fixed inset-x-0 bottom-0 bg-black/75 z-[9998] pointer-events-none"
            style={{ top: spotlightRect.top + spotlightRect.height }}
          />
          <div
            className="fixed bg-black/75 z-[9998] pointer-events-none"
            style={{
              top: spotlightRect.top,
              left: 0,
              width: spotlightRect.left,
              height: spotlightRect.height,
            }}
          />
          <div
            className="fixed bg-black/75 z-[9998] pointer-events-none"
            style={{
              top: spotlightRect.top,
              left: spotlightRect.left + spotlightRect.width,
              right: 0,
              height: spotlightRect.height,
            }}
          />
          {/* Glowing ring */}
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

      {/* Click-blocker */}
      <div
        className="fixed inset-0 z-[9997]"
        onClick={(e) => e.stopPropagation()}
      />

      {/* ── Tooltip card ─────────────────────────────── */}
      <div
        ref={tooltipRef}
        style={{ ...tooltipStyle, width: TOOLTIP_W }}
        className="fixed z-[10000] bg-[#0f0f0f] border border-[#2c2c2c] rounded-2xl shadow-2xl p-5 select-none"
      >
        {/* Page progress breadcrumb */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1 flex-wrap">
            {PAGE_ORDER.map((p, i) => {
              const done = i < currentPageIdx;
              const active = i === currentPageIdx;
              return (
                <div key={p} className="flex items-center gap-1">
                  <span
                    className={`text-[9px] font-medium px-2 py-0.5 rounded-full transition-colors ${
                      active
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : done
                        ? "text-emerald-700"
                        : "text-[#383838]"
                    }`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </span>
                  {i < PAGE_ORDER.length - 1 && (
                    <ChevronRight
                      className={`w-2.5 h-2.5 ${
                        done || active ? "text-emerald-700/60" : "text-[#2a2a2a]"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <button
            onClick={handleSkip}
            className="text-[var(--text-muted)] hover:text-[#777] transition-colors rounded p-0.5 ml-2 flex-shrink-0"
            aria-label="Close tour"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-1 mb-3">
          {pageSteps.map((_, i) => (
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

        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2 leading-snug">
          {currentStep.title}
        </h3>
        <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed mb-5 whitespace-pre-line">
          {currentStep.content}
        </p>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-[10px] text-[var(--text-muted)] hover:text-[#777] transition-colors"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] text-[#777] hover:text-white border border-[var(--border)] hover:border-[var(--border-hover)] rounded-lg transition-colors"
              >
                <ChevronLeft className="w-3 h-3" />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-medium"
            >
              {isLastStep
                ? `Next: ${nextPageLabel} →`
                : "Next"}
              {!isLastStep && <ChevronRight className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/** Button to re-open the platform tour */
export function PlatformTourTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Platform tour guide"
      className="flex items-center justify-center w-7 h-7 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] hover:bg-[#1e1e1e] text-[var(--text-muted)] hover:text-emerald-400 transition-colors"
    >
      <HelpCircle className="w-3.5 h-3.5" />
    </button>
  );
}
