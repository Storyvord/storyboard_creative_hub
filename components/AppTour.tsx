"use client";

/**
 * AppTour — universal guided tour for Dashboard + Project pages.
 * Works like PlatformTour: spotlight + tooltip overlay.
 * Each "page" key maps to a set of steps with optional data-tour targets.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { X, ChevronRight, ChevronLeft, HelpCircle } from "lucide-react";

export const APP_TOUR_DONE_KEY = "app_tour_v2_done";

const PAD = 10;
const TOOLTIP_W = 340;
const TOOLTIP_H = 280; // generous estimate to prevent off-screen

// ─── Step definitions ─────────────────────────────────────────────────────────
interface TourStep {
  id: string;
  page: string; // key matching PAGE_MAP
  title: string;
  content: string;
  target: string | null;
  position?: "top" | "bottom" | "left" | "right" | "bottom-left";
}

const TOUR_STEPS: TourStep[] = [
  // ── Dashboard ────────────────────────────────────────────────────────────────
  {
    id: "dash-welcome",
    page: "dashboard",
    title: "Welcome to Storyvord",
    content:
      "Your command center for all film projects. At a glance you'll see project activity, upcoming schedule events, team stats, and quick links to everything you need. Let's walk through it.",
    target: null,
  },
  {
    id: "dash-stats",
    page: "dashboard",
    title: "Stats Overview",
    content:
      "Top stat cards summarise total projects, unread notifications, today's calendar events, and your network connections — all updated in real-time.",
    target: "dash-stats",
    position: "bottom",
  },
  {
    id: "dash-schedule",
    page: "dashboard",
    title: "Today's Schedule",
    content:
      "The green banner shows events due today from your unified calendar. Click any event title to jump to the Calendar view for that project.",
    target: "dash-schedule",
    position: "bottom",
  },
  {
    id: "dash-projects",
    page: "dashboard",
    title: "Recent Projects",
    content:
      "Your most recently active projects. Each card shows name, status badge, and creation date. Click a project card to open it, or use the 'New Project' button to start a fresh production.",
    target: "dash-projects",
    position: "bottom",
  },
  {
    id: "dash-activity",
    page: "dashboard",
    title: "Recent Activity",
    content:
      "A real-time feed of the latest notifications across all your projects — script uploads, team invites, task updates, and more.",
    target: "dash-activity",
    position: "top",
  },
  {
    id: "dash-upcoming",
    page: "dashboard",
    title: "Upcoming Events",
    content:
      "Events from the next 7 days across all projects. Colour-coded by project for quick scanning.",
    target: "dash-upcoming",
    position: "left",
  },
  {
    id: "dash-quicklinks",
    page: "dashboard",
    title: "Quick Links",
    content:
      "Jump straight to Notifications, Crew Search, your Network, or the Inbox from the sidebar quick-links panel.",
    target: "dash-quicklinks",
    position: "left",
  },

  // ── Project Overview ──────────────────────────────────────────────────────────
  {
    id: "ov-welcome",
    page: "overview",
    title: "Project Overview",
    content:
      "This is the project home page — a summary of the production with edit access for producers and owners.",
    target: null,
  },
  {
    id: "ov-details",
    page: "overview",
    title: "Project Details",
    content:
      "Name, status badge, description, and creation date. Use the Edit button (pencil) to update the title, description, or status. Owners can also delete the project from here.",
    target: "overview-details",
    position: "bottom",
  },
  {
    id: "ov-crew",
    page: "overview",
    title: "Crew List",
    content:
      "All project members with their roles. Head to the Team page in the sidebar to invite new crew members or manage permissions.",
    target: "overview-crew",
    position: "top",
  },

  // ── Tasks ────────────────────────────────────────────────────────────────────
  {
    id: "tasks-welcome",
    page: "tasks",
    title: "Project Tasks",
    content:
      "A Kanban board for tracking production work. Columns represent task status: To Do → In Progress → Done. Tasks can be assigned to team members and given due dates.",
    target: null,
  },
  {
    id: "tasks-create",
    page: "tasks",
    title: "Create a Task",
    content:
      "Click 'Add Task' to create a new task. Fill in the title, description, assignee, due date, and priority. Tasks automatically appear in the correct column.",
    target: "tasks-add-btn",
    position: "bottom-left",
  },
  {
    id: "tasks-kanban",
    page: "tasks",
    title: "Kanban Columns",
    content:
      "Drag cards between columns to update their status. Click a card to open the detail panel where you can add comments, checklists, and attachments.",
    target: "tasks-board",
    position: "top",
  },

  // ── Files ────────────────────────────────────────────────────────────────────
  {
    id: "files-welcome",
    page: "files",
    title: "Project Files",
    content:
      "Store and organise all production assets — scripts, contracts, call sheets, reference images, and more. Files are organised into folders.",
    target: null,
  },
  {
    id: "files-folders",
    page: "files",
    title: "Folders",
    content:
      "Click a folder to open it and see its contents. Use the 'New Folder' button to create sub-directories. Rename or delete folders from the three-dot menu.",
    target: "files-folders",
    position: "bottom",
  },
  {
    id: "files-upload",
    page: "files",
    title: "Upload Files",
    content:
      "Open a folder then click 'Upload File' to add assets. Supported types include PDFs, images, scripts, and documents.",
    target: "files-upload-btn",
    position: "bottom-left",
  },

  // ── Callsheets ────────────────────────────────────────────────────────────────
  {
    id: "callsheets-welcome",
    page: "callsheets",
    title: "Call Sheets",
    content:
      "Create and distribute daily call sheets for your shoots. Each sheet includes crew call times, location details, weather, and nearest facilities.",
    target: null,
  },
  {
    id: "callsheets-create",
    page: "callsheets",
    title: "Create a Call Sheet",
    content:
      "Click 'New Call Sheet' to start filling in a shoot day. Enter the location, general call time, individual crew call times, and any special instructions.",
    target: "callsheet-create-btn",
    position: "bottom-left",
  },

  // ── Announcements ─────────────────────────────────────────────────────────────
  {
    id: "announce-welcome",
    page: "announcements",
    title: "Announcements",
    content:
      "Broadcast important updates to the whole crew or specific members. Announcements can be pinned and include read-receipt tracking.",
    target: null,
  },
  {
    id: "announce-create",
    page: "announcements",
    title: "Post an Announcement",
    content:
      "Click 'New Announcement' to compose a message. You can target all crew or select specific members, and track who has read it from the analytics view.",
    target: "announce-create-btn",
    position: "bottom-left",
  },

  // ── Calendar ─────────────────────────────────────────────────────────────────
  {
    id: "cal-welcome",
    page: "calendar",
    title: "Project Calendar",
    content:
      "A timeline view of all shoot days, meetings, deadlines, and milestones for this project. Events sync with your dashboard's unified calendar.",
    target: null,
  },

  // ── Jobs ──────────────────────────────────────────────────────────────────────
  {
    id: "jobs-welcome",
    page: "jobs",
    title: "Job Postings",
    content:
      "Post crew positions you need to fill for this production. Listings are visible to your network and crew-search results. Set role, rate, location, and requirements.",
    target: null,
  },
  {
    id: "jobs-create",
    page: "jobs",
    title: "Post a Job",
    content:
      "Click 'Post Job' to create a listing. Once live, crew members can apply and you can manage applications directly from this page.",
    target: "jobs-create-btn",
    position: "bottom-left",
  },

  // ── Reports ───────────────────────────────────────────────────────────────────
  {
    id: "reports-welcome",
    page: "reports",
    title: "Research Deck",
    content:
      "AI-generated reports for each scene — breakdowns, location research, character analysis, costume notes, and production planning data, all derived from your script.",
    target: null,
  },
  {
    id: "reports-generate",
    page: "reports",
    title: "Generate Reports",
    content:
      "Select a scene and choose a report type, then click Generate. Reports are saved and can be regenerated as your script evolves.",
    target: "reports-generate-btn",
    position: "bottom",
  },

  // ── Notifications ─────────────────────────────────────────────────────────────
  {
    id: "notif-welcome",
    page: "notifications",
    title: "Notifications",
    content:
      "All activity from across your projects in one place: team invitations, script uploads, task assignments, announcement reads, and AI job completions. Use 'Mark all read' to clear the badge.",
    target: null,
  },
  {
    id: "notif-filter",
    page: "notifications",
    title: "Filter by Category",
    content:
      "Use the category tabs to filter by notification type — Production, Tasks, Creative, Network, etc. — so you can focus on what matters.",
    target: "notif-filter",
    position: "bottom",
  },

  // ── Profile ───────────────────────────────────────────────────────────────────
  {
    id: "profile-welcome",
    page: "profile",
    title: "Your Profile",
    content:
      "Update your name, photo, job title, phone number, location, languages, and bio here. This information is visible to collaborators on your projects.",
    target: null,
  },
  {
    id: "profile-photo",
    page: "profile",
    title: "Profile Photo",
    content:
      "Click the camera icon or 'Change Photo' to upload a new profile picture. Images are stored securely and appear next to your name across the platform.",
    target: "profile-photo",
    position: "right",
  },
];

// ─── Page detection ───────────────────────────────────────────────────────────
function detectPage(pathname: string): string {
  if (pathname === "/dashboard" || pathname === "/") return "dashboard";
  if (pathname === "/notifications") return "notifications";
  if (pathname === "/profile") return "profile";
  if (pathname.includes("/overview")) return "overview";
  if (pathname.includes("/tasks")) return "tasks";
  if (pathname.includes("/files")) return "files";
  if (pathname.includes("/callsheets")) return "callsheets";
  if (pathname.includes("/announcements")) return "announcements";
  if (pathname.includes("/calendar")) return "calendar";
  if (pathname.includes("/jobs")) return "jobs";
  if (pathname.includes("/reports")) return "reports";
  return "";
}

// ─── Spotlight rect type ──────────────────────────────────────────────────────
interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  onDone: () => void;
}

export default function AppTour({ onDone }: Props) {
  const pathname = usePathname();
  const page = detectPage(pathname);
  const pageSteps = TOUR_STEPS.filter((s) => s.page === page);

  const [step, setStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentStep = pageSteps[step] ?? pageSteps[0];
  const isLast = step === pageSteps.length - 1;

  const computeLayout = useCallback(() => {
    if (!currentStep?.target) {
      setSpotlightRect(null);
      setTooltipStyle({ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)" });
      return;
    }

    const el = document.querySelector(`[data-tour="${currentStep.target}"]`) as HTMLElement | null;
    if (!el) {
      setSpotlightRect(null);
      setTooltipStyle({ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)" });
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
        left = Math.min(Math.max(sp.left + sp.width / 2 - TOOLTIP_W / 2, 12), vw - TOOLTIP_W - 12);
        break;
      case "left":
        top = Math.min(Math.max(sp.top + sp.height / 2 - TOOLTIP_H / 2, 12), vh - TOOLTIP_H - 12);
        left = Math.max(sp.left - TOOLTIP_W - margin, 12);
        break;
      case "right":
        top = Math.min(Math.max(sp.top + sp.height / 2 - TOOLTIP_H / 2, 12), vh - TOOLTIP_H - 12);
        left = Math.min(sp.left + sp.width + margin, vw - TOOLTIP_W - 12);
        break;
      case "bottom-left":
        top = sp.top + sp.height + margin;
        right = Math.min(vw - (sp.left + sp.width), vw - TOOLTIP_W - 12);
        right = Math.max(right, 12);
        break;
      default: // bottom
        top = sp.top + sp.height + margin;
        left = Math.min(Math.max(sp.left + sp.width / 2 - TOOLTIP_W / 2, 12), vw - TOOLTIP_W - 12);
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
      const el = document.querySelector(`[data-tour="${currentStep.target}"]`) as HTMLElement | null;
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

  useEffect(() => { setStep(0); }, [page]);

  if (!currentStep || pageSteps.length === 0) return null;

  const handleSkip = () => { localStorage.setItem(APP_TOUR_DONE_KEY, "true"); onDone(); };
  const handleNext = () => { if (isLast) handleSkip(); else setStep((s) => s + 1); };
  const handlePrev = () => { if (step > 0) setStep((s) => s - 1); };

  return (
    <>
      {spotlightRect ? (
        <>
          <div className="fixed inset-x-0 top-0 bg-black/75 z-[9998] pointer-events-none" style={{ height: spotlightRect.top }} />
          <div className="fixed inset-x-0 bottom-0 bg-black/75 z-[9998] pointer-events-none" style={{ top: spotlightRect.top + spotlightRect.height }} />
          <div className="fixed bg-black/75 z-[9998] pointer-events-none" style={{ top: spotlightRect.top, left: 0, width: spotlightRect.left, height: spotlightRect.height }} />
          <div className="fixed bg-black/75 z-[9998] pointer-events-none" style={{ top: spotlightRect.top, left: spotlightRect.left + spotlightRect.width, right: 0, height: spotlightRect.height }} />
          <div className="fixed z-[9999] rounded-lg border-2 border-emerald-400/70 shadow-[0_0_24px_rgba(52,211,153,0.35)] pointer-events-none transition-all duration-300" style={{ top: spotlightRect.top, left: spotlightRect.left, width: spotlightRect.width, height: spotlightRect.height }} />
        </>
      ) : (
        <div className="fixed inset-0 bg-black/75 z-[9998] pointer-events-none" />
      )}

      <div className="fixed inset-0 z-[9997]" onClick={(e) => e.stopPropagation()} />

      <div
        ref={tooltipRef}
        style={{ ...tooltipStyle, width: TOOLTIP_W, maxHeight: "calc(100vh - 24px)" }}
        className="fixed z-[10000] bg-[#0f0f0f] border border-[#2c2c2c] rounded-2xl shadow-2xl p-5 select-none overflow-y-auto"
      >
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-widest">
            Step {step + 1} of {pageSteps.length}
          </p>
          <button onClick={handleSkip} className="text-[var(--text-muted)] hover:text-[#777] transition-colors rounded p-0.5" aria-label="Close tour">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dots */}
        <div className="flex items-center gap-1 mb-3">
          {pageSteps.map((_, i) => (
            <div key={i} className={`rounded-full transition-all duration-300 ${i === step ? "w-4 h-1.5 bg-emerald-400" : i < step ? "w-1.5 h-1.5 bg-emerald-700" : "w-1.5 h-1.5 bg-[#2a2a2a]"}`} />
          ))}
        </div>

        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2 leading-snug">{currentStep.title}</h3>
        <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed mb-5 whitespace-pre-line">{currentStep.content}</p>

        <div className="flex items-center justify-between">
          <button onClick={handleSkip} className="text-[10px] text-[var(--text-muted)] hover:text-[#777] transition-colors">
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button onClick={handlePrev} className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] text-[#777] hover:text-white border border-[var(--border)] hover:border-[var(--border-hover)] rounded-lg transition-colors">
                <ChevronLeft className="w-3 h-3" /> Back
              </button>
            )}
            <button onClick={handleNext} className="flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-medium">
              {isLast ? "Done" : "Next"}
              {!isLast && <ChevronRight className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/** Floating help button to re-trigger the tour */
export function AppTourTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Page guide"
      className="flex items-center justify-center w-8 h-8 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] hover:bg-[#1e1e1e] text-[var(--text-muted)] hover:text-emerald-400 transition-colors shadow-lg"
    >
      <HelpCircle className="w-4 h-4" />
    </button>
  );
}
