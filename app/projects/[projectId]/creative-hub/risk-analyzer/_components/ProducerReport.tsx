"use client";

// Renders the producer-facing operational report. Where InsuranceReport is
// a single narrative block + bullet list (broker-style), this view is built
// from a deck of independent "do this next" cards: pre-production checklist,
// scene-by-scene priorities, daily briefings, crew recommendations, equipment.
//
// Visual contract:
//   - Each section gets its own card with a CheckSquare-iconed header so the
//     report reads like an actionable to-do list rather than a legal letter.
//   - Inner-card chips/icons use the amber palette (bg-amber-50 / text-amber-700
//     / border-amber-200) so the whole producer view is visually unified with
//     the amber header strip; the sibling InsuranceReport keeps blue for the
//     same reason. This makes mid-scroll "which report am I in?" obvious.
//   - Empty/missing fields are tolerated silently — the backend may roll out
//     sections in stages and partial data should still render usefully.
//   - The "Download Producer PDF" button is parented at the top right, where
//     the InsuranceReport's "Download Signed PDF" button sits, so the two
//     sub-reports look like siblings.
//
// Text-rendering contract (defence-in-depth): every ``report.*`` string —
// executive_summary, top_risks_to_address[], scene_by_scene_priorities[].*,
// pre_production_checklist[], equipment_checklist[], daily_safety_briefings[],
// additional_crew_recommendations[] — flows into JSX text children only.
// We deliberately do NOT use dangerouslySetInnerHTML, do NOT pass any
// report field into an ``href``, and do NOT pipe report text through a
// markdown renderer. The whitespace-pre-line styling below is CSS-only;
// it does not parse the string. If a future change adds a markdown
// renderer here, configure it with disallowedElements / skipHtml and
// no rehype-raw — the upstream LLM is treated as an untrusted source.

import {
  CheckSquare,
  ClipboardList,
  Download,
  Film,
  Megaphone,
  Package,
  Users,
} from "lucide-react";
import { ProducerReport as ProducerReportType, Severity } from "@/types/risk-analyzer";
import { SEVERITY_COLOR } from "./constants";

interface ProducerReportProps {
  report: ProducerReportType | null | undefined;
  pdfUrl?: string | null;
  onDownloadPdf?: () => void;
  /** Click-through into Scenes tab for the action-item scene chips. */
  onSelectScene?: (sceneId: number) => void;
}

export default function ProducerReport({
  report,
  pdfUrl,
  onDownloadPdf,
  onSelectScene,
}: ProducerReportProps) {
  if (!report) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text-muted)]">
        Producer report will appear once the analysis is finalized.
      </div>
    );
  }

  const hasScenePriorities =
    Array.isArray(report.scene_by_scene_priorities) &&
    report.scene_by_scene_priorities.length > 0;

  return (
    <div className="space-y-4">
      {/* Amber accent mirrors the producer PDF palette so the two
          reports are immediately distinguishable from the insurance
          sibling (which uses a cool-blue border-left). */}
      <header className="flex flex-col gap-2 rounded-xl border border-l-4 border-amber-500 border-[var(--border)] bg-[var(--surface)] p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/10 text-amber-500">
            <ClipboardList size={18} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Producer Risk Analysis
            </h3>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
              Line Producer / Production Manager facing — actionable
              scene-by-scene plan.
            </p>
          </div>
        </div>
        {pdfUrl && onDownloadPdf && (
          <button
            type="button"
            onClick={onDownloadPdf}
            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500"
          >
            <Download size={12} /> Download Producer PDF
          </button>
        )}
      </header>

      {report.executive_summary && (
        <Card icon={<ClipboardList size={14} />} title="Executive summary">
          <p className="whitespace-pre-line text-xs text-[var(--text-secondary)]">
            {report.executive_summary}
          </p>
        </Card>
      )}

      {Array.isArray(report.top_risks_to_address) &&
        report.top_risks_to_address.length > 0 && (
          <Card icon={<CheckSquare size={14} />} title="Top risks to address">
            <ChecklistList items={report.top_risks_to_address} />
          </Card>
        )}

      {hasScenePriorities && (
        <Card icon={<Film size={14} />} title="Scene-by-scene priorities">
          <ul className="space-y-3">
            {report.scene_by_scene_priorities.map((sa, idx) => (
              <li
                key={`${sa.scene_id ?? sa.scene_order ?? "scene"}-${idx}`}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] p-3"
              >
                <div className="mb-1.5 flex items-center gap-2">
                  {sa.severity && (
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: SEVERITY_COLOR[sa.severity as Severity],
                      }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      sa.scene_id != null && onSelectScene?.(sa.scene_id)
                    }
                    disabled={sa.scene_id == null}
                    className="text-xs font-semibold text-[var(--text-primary)] hover:text-amber-700 disabled:cursor-default disabled:hover:text-[var(--text-primary)]"
                  >
                    {sa.heading
                      ? sa.heading
                      : sa.scene_order != null
                        ? `Scene ${sa.scene_order}`
                        : "Scene"}
                  </button>
                </div>
                {sa.summary && (
                  <p className="mb-2 whitespace-pre-line text-xs text-[var(--text-secondary)]">
                    {sa.summary}
                  </p>
                )}
                {Array.isArray(sa.action_items) && sa.action_items.length > 0 && (
                  <ChecklistList items={sa.action_items} compact />
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {Array.isArray(report.pre_production_checklist) &&
        report.pre_production_checklist.length > 0 && (
          <Card
            icon={<CheckSquare size={14} />}
            title="Pre-production checklist"
          >
            <ChecklistList items={report.pre_production_checklist} />
          </Card>
        )}

      {Array.isArray(report.equipment_checklist) &&
        report.equipment_checklist.length > 0 && (
          <Card icon={<Package size={14} />} title="Equipment checklist">
            <ChecklistList items={report.equipment_checklist} />
          </Card>
        )}

      {Array.isArray(report.daily_safety_briefings) &&
        report.daily_safety_briefings.length > 0 && (
          <Card icon={<Megaphone size={14} />} title="Daily safety briefings">
            <ChecklistList items={report.daily_safety_briefings} />
          </Card>
        )}

      {Array.isArray(report.additional_crew_recommendations) &&
        report.additional_crew_recommendations.length > 0 && (
          <Card icon={<Users size={14} />} title="Additional crew recommendations">
            <ChecklistList items={report.additional_crew_recommendations} />
          </Card>
        )}
    </div>
  );
}

interface CardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function Card({ icon, title, children }: CardProps) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <header className="mb-3 flex items-center gap-2">
        {/* Inner-card chip uses the amber palette so producer-side
            iconography is consistent with the report header's amber
            identity (insurance keeps blue across both header + chips). */}
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-amber-200 bg-amber-50 text-amber-700">
          {icon}
        </span>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
          {title}
        </h4>
      </header>
      <div>{children}</div>
    </section>
  );
}

interface ChecklistListProps {
  items: string[];
  /** Compact mode uses smaller icons / spacing for nested lists. */
  compact?: boolean;
}

function ChecklistList({ items, compact }: ChecklistListProps) {
  return (
    <ul className={compact ? "space-y-1" : "space-y-1.5"}>
      {items.map((item, i) => (
        <li
          key={i}
          className="flex items-start gap-2 text-xs text-[var(--text-secondary)]"
        >
          <CheckSquare
            size={compact ? 11 : 13}
            // Amber check icon keeps each item on the producer-side
            // palette — matches the header strip and inner-card chips.
            className="mt-0.5 shrink-0 text-amber-700"
          />
          <span className="whitespace-pre-line">{item}</span>
        </li>
      ))}
    </ul>
  );
}
