"use client";

// DeckRenderer — the top-level "PowerBI-style" dashboard renderer used by both
// the project Research Deck and the per-scene Scene Reports deck.
//
// Inputs:
//   - `data`: any plain object (KPI scalars at top level + nested sections).
//   - `envelopeSections` (optional): the STO-1066 envelope `sections[]` array,
//     used when an explicit `viz_type` hint is present. Falls back to the
//     heuristic classifier on `data` when omitted.
//   - `executiveSummary` (optional): paragraph rendered above the deck.

import * as React from "react";
import { PALETTE, SKIP_KEYS, SectionKind, classifySection, vizTypeToKind } from "./classify";
import {
  BarSection,
  BudgetSection,
  CrewSection,
  KPIStrip,
  LineSection,
  NestedKPIs,
  PieSection,
  ProseSection,
  RiskMatrixSection,
  SectionWrap,
  TableSection,
  TimelineSection,
} from "./sections";

interface ClassifiedSection {
  key: string;
  value: unknown;
  kind: SectionKind;
}

// Section block dispatcher
function SectionBlock({ item, colorIdx }: { item: ClassifiedSection; colorIdx: number }) {
  const color = PALETTE[colorIdx % PALETTE.length];
  const { key, value, kind } = item;

  if (kind === "crew")
    return (
      <SectionWrap label={key} color={color} fullWidth>
        <CrewSection data={value} />
      </SectionWrap>
    );

  if (kind === "budget")
    return (
      <SectionWrap label={key} color={color} fullWidth>
        <BudgetSection data={value} />
      </SectionWrap>
    );

  if (kind === "timeline")
    return (
      <SectionWrap label={key} color={color} fullWidth>
        <TimelineSection data={(Array.isArray(value) ? value : [value]) as unknown[]} />
      </SectionWrap>
    );

  if (kind === "risk_matrix")
    return (
      <SectionWrap label={key} color={color} fullWidth>
        <RiskMatrixSection data={value} />
      </SectionWrap>
    );

  if (kind === "chart_bar" && Array.isArray(value) && value.length > 0 && typeof value[0] === "object")
    return (
      <SectionWrap label={key} color={color}>
        <BarSection data={value as Record<string, unknown>[]} />
      </SectionWrap>
    );

  if (kind === "chart_line" && Array.isArray(value) && value.length > 0 && typeof value[0] === "object")
    return (
      <SectionWrap label={key} color={color}>
        <LineSection data={value as Record<string, unknown>[]} />
      </SectionWrap>
    );

  if (kind === "chart_pie" && Array.isArray(value) && value.length > 0 && typeof value[0] === "object")
    return (
      <SectionWrap label={key} color={color}>
        <PieSection data={value as Record<string, unknown>[]} />
      </SectionWrap>
    );

  if (kind === "table")
    return (
      <SectionWrap label={key} color={color} fullWidth>
        <TableSection data={Array.isArray(value) ? (value as unknown[]) : [value]} />
      </SectionWrap>
    );

  if (kind === "nested_kpis")
    return (
      <SectionWrap label={key} color={color} fullWidth>
        <NestedKPIs data={(typeof value === "object" && value !== null ? (value as Record<string, unknown>) : { value })} />
      </SectionWrap>
    );

  if (kind === "prose")
    return (
      <SectionWrap label={key} color={color} fullWidth>
        <ProseSection text={typeof value === "string" ? value : JSON.stringify(value, null, 2)} />
      </SectionWrap>
    );

  // fallback
  return (
    <SectionWrap label={key} color={color} fullWidth>
      <NestedKPIs
        data={typeof value === "object" && value !== null ? (value as Record<string, unknown>) : { value }}
      />
    </SectionWrap>
  );
}

export interface EnvelopeSection {
  section_id?: string;
  section_title?: string;
  sort_order?: number;
  viz_type?: string;
  data?: Record<string, unknown> | null;
}

export interface DeckRendererProps {
  /** Free-form structured payload (project reports use this directly). */
  data: Record<string, unknown> | null | undefined;
  /** STO-1066 envelope `sections[]` array — when present, sections with
   *  recognised `viz_type` hints are rendered first; remaining keys in `data`
   *  are then run through the heuristic classifier. */
  envelopeSections?: EnvelopeSection[] | null;
  /** Optional hero paragraph rendered above the deck. */
  executiveSummary?: string | null;
}

export function DeckRenderer({ data, envelopeSections, executiveSummary }: DeckRendererProps) {
  // No usable payload at all → render a placeholder so callers don't have to
  // duplicate this branch.
  const hasData = data && typeof data === "object" && Object.keys(data).length > 0;
  const hasEnvelope = Array.isArray(envelopeSections) && envelopeSections.length > 0;
  const hasSummary = !!executiveSummary && executiveSummary.trim().length > 0;

  if (!hasData && !hasEnvelope && !hasSummary) {
    return (
      <div style={{ textAlign: "center", padding: "64px 0", borderRadius: 12, border: "2px dashed var(--border)" }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No data available.</p>
      </div>
    );
  }

  // 1. Envelope sections with explicit viz_type → render through dispatcher.
  const envelopeBlocks: ClassifiedSection[] = [];
  if (hasEnvelope) {
    const sorted = [...envelopeSections!].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    for (const s of sorted) {
      const kind = vizTypeToKind(s.viz_type);
      if (!kind) continue;
      const sectionData = s.data ?? {};
      // Most viz handlers expect a "value" — if the section payload is shaped
      // like `{ key: ... }` we let the natural shape flow through; otherwise
      // pass the section itself.
      const rawValue: unknown = (() => {
        if (kind === "prose") {
          return (
            (sectionData as Record<string, unknown>).markdown ??
            (sectionData as Record<string, unknown>).text ??
            (sectionData as Record<string, unknown>).prose ??
            JSON.stringify(sectionData, null, 2)
          );
        }
        if (kind === "table") {
          const rows = (sectionData as Record<string, unknown>).rows ?? sectionData;
          return rows;
        }
        if (kind === "nested_kpis") {
          return (sectionData as Record<string, unknown>).metrics ?? sectionData;
        }
        if (kind === "risk_matrix") {
          return (sectionData as Record<string, unknown>).risks ?? sectionData;
        }
        return sectionData;
      })();
      envelopeBlocks.push({
        key: s.section_title || s.section_id || "section",
        value: rawValue,
        kind,
      });
    }
  }

  // 2. Heuristic classifier on the free-form data payload.
  let scalars: [string, unknown][] = [];
  let classified: ClassifiedSection[] = [];
  if (hasData && typeof data === "object" && !Array.isArray(data)) {
    const entries = Object.entries(data!).filter(([k]) => !SKIP_KEYS.has(k.toLowerCase()));
    scalars = entries.filter(([, v]) => typeof v !== "object" || v === null);
    const sectionEntries = entries.filter(([, v]) => typeof v === "object" && v !== null);
    classified = sectionEntries.map(([k, v]) => ({ key: k, value: v, kind: classifySection(k, v) }));
  }

  // Layout: pair adjacent half-width charts side-by-side; everything else full-width.
  const halfWidthKinds: SectionKind[] = ["chart_bar", "chart_line", "chart_pie"];
  type Row =
    | { type: "kpi" }
    | { type: "pair"; a: ClassifiedSection; b: ClassifiedSection }
    | { type: "single"; item: ClassifiedSection };
  const rows: Row[] = [];
  if (scalars.length > 0) rows.push({ type: "kpi" });

  // Envelope blocks first (they had explicit viz_type hints from the LLM).
  const ordered = [...envelopeBlocks, ...classified];
  let i = 0;
  while (i < ordered.length) {
    const cur = ordered[i];
    const next = ordered[i + 1];
    if (halfWidthKinds.includes(cur.kind) && next && halfWidthKinds.includes(next.kind)) {
      rows.push({ type: "pair", a: cur, b: next });
      i += 2;
    } else {
      rows.push({ type: "single", item: cur });
      i++;
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%" }}>
      {/* Executive summary hero */}
      {hasSummary && (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            borderLeft: `3px solid ${PALETTE[0]}`,
          }}
        >
          <p
            style={{
              fontSize: 10,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 6,
            }}
          >
            Executive Summary
          </p>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
            {executiveSummary}
          </p>
        </div>
      )}

      {/* Body grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
        {rows.map((row, ri) => {
          if (row.type === "kpi") return <KPIStrip key="kpi" stats={scalars} />;
          if (row.type === "pair")
            return (
              <div key={ri} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%" }}>
                <SectionBlock item={row.a} colorIdx={ri * 2} />
                <SectionBlock item={row.b} colorIdx={ri * 2 + 1} />
              </div>
            );
          return <SectionBlock key={ri} item={row.item} colorIdx={ri} />;
        })}
      </div>
    </div>
  );
}
