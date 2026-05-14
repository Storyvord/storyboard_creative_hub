// Risk Analyzer types — mirrors the backend envelope shape documented in
// `creative_hub/risk/FRONTEND_INTEGRATION.md`. The dashboard never recomputes
// scores client-side; every mutation re-reads `GET results/` and the backend
// returns the up-to-date envelope in one round trip.

export type RiskAnalysisStatus =
  | "PENDING"
  | "CLASSIFYING"
  | "MITIGATING"
  | "AWAITING_APPROVAL"
  | "FINALIZING"
  | "FINALIZED"
  | "FAILED"
  | "CANCELLED";

/** Lowercase variant used by some backend status payloads (`/status/`). */
export type RiskAnalysisStatusLower =
  | "pending"
  | "classifying"
  | "mitigating"
  | "awaiting_approval"
  | "finalizing"
  | "finalized"
  | "failed"
  | "cancelled";

export type Severity = "Low" | "Medium" | "High" | "Critical";

export type ScoreBand = "Low" | "Medium" | "High";

export type Confidence = "low" | "medium" | "high";

export type Source =
  | "ai"
  | "ai_critic"
  | "ai_metadata_rule"
  | "user_added"
  | "user_modified";

export type ApprovalState = "none" | "agreed" | "disagreed";

export type AuditFlag = string;

// ── Drift warnings ─────────────────────────────────────────────────────────
export interface DriftWarning {
  kind: string;
  payload?: Record<string, unknown> | null;
  at?: string;
}

// ── Insurance & edit summary ────────────────────────────────────────────────
export interface RiskInsurance {
  tier: string;
  multiplier: number;
  premium_low_k?: number;
  premium_high_k?: number;
  tier_riders?: string | null;
  risk_level?: number;
}

export interface RiskEditSummary {
  ai_findings_count: number;
  user_added_count: number;
  user_modified_count: number;
  user_deleted_count: number;
  ai_only_score: number;
  current_score: number;
  /** Backend returns a number (e.g. +22). Some payload variants stringify. */
  delta: number | string;
}

// ── Findings / mitigations ──────────────────────────────────────────────────
/** Recoverable AI baseline copied to a finding/mitigation on first user edit. */
export interface OriginalAiFindingPayload {
  category?: string;
  category_slug?: string;
  severity?: Severity;
  reason?: string;
  evidence_quote?: string;
  confidence?: Confidence;
}

export interface OriginalAiMitigationPayload {
  recommendation?: string;
  equipment_needed?: string;
  personnel_required?: string;
}

export interface RiskFinding {
  id: number;
  category: string;
  category_slug: string;
  severity: Severity;
  reason: string;
  evidence_quote: string;
  confidence: Confidence;
  source: Source;
  audit_flags: AuditFlag[];
  approval_state: ApprovalState;
  deleted_by_user: boolean;
  /** Present only when source != "ai" (there's something to revert to). */
  original_ai_payload?: OriginalAiFindingPayload | null;
}

export interface RiskMitigation {
  id?: number;
  finding_id: number;
  recommendation: string;
  equipment_needed?: string;
  personnel_required?: string;
  source: Source;
  /** Storage backend URL (S3 presigned or media path). `null` = no evidence. */
  evidence_file_url: string | null;
  original_ai_payload?: OriginalAiMitigationPayload | null;
}

export interface RiskSeverityBreakdown {
  Critical: number;
  High: number;
  Medium: number;
  Low: number;
}

export interface RiskScene {
  scene_id: number;
  heading: string;
  order: number;
  cumulative_deduction: number;
  projected_score: number;
  exposure_contribution: number;
  severity_breakdown: RiskSeverityBreakdown;
  findings: RiskFinding[];
  mitigations: RiskMitigation[];
  /**
   * Backend hint (optional during rollout): False when the scene has no
   * non-deleted findings. When the field is missing we derive it client-side
   * from `findings`. Lets the UI render a "No risk identified" affordance
   * rather than a misleading max-score for empty/cancelled analyses.
   */
  has_findings?: boolean;
}

// ── Summary stats / category breakdown ──────────────────────────────────────
export interface RiskSummaryStats {
  total_scenes_parsed: number;
  scenes_analysed: number;
  scenes_approved: number;
  total_risks_found: number;
  severity_distribution: RiskSeverityBreakdown;
  /**
   * Backend hint (optional during rollout): True when the envelope has zero
   * non-deleted findings. Drives the empty-state UI on Overview / donut /
   * KPI strip — replaces the "every scene = max_score" misleading default.
   */
  is_empty?: boolean;
}

/**
 * Present only when `status == "CANCELLED"`. Tells the UI whether finalize
 * is still available (the backend now accepts CANCELLED-with-findings) and
 * how much partial data was captured before cancellation.
 */
export interface CancelledContext {
  findings_count: number;
  finalize_available_from_cancelled: boolean;
}

export interface RiskCategoryBreakdown {
  category: string;
  domain: string;
  count: number;
  deduction: number;
}

// ── Graph ───────────────────────────────────────────────────────────────────
export type RiskGraphNodeGroup = "scene" | "risk" | "location" | "action";

export interface RiskGraphNode {
  id: string;
  label: string;
  group: RiskGraphNodeGroup;
  color: string;
  size: number;
  risk_count?: number;
  severity?: Severity;
}

export interface RiskGraphEdge {
  source: string;
  target: string;
  label: string;
  severity?: Severity;
}

export interface RiskGraphLegendEntry {
  group: RiskGraphNodeGroup | string;
  label: string;
  color?: string;
  color_by_severity?: boolean;
}

export interface RiskGraph {
  nodes: RiskGraphNode[];
  edges: RiskGraphEdge[];
  legend: RiskGraphLegendEntry[];
  score_band: ScoreBand;
}

// ── Compliance / Reports ────────────────────────────────────────────────────
export interface ComplianceReport {
  executive_summary: string;
  compliance_statement: string;
  mitigation_verification: string;
  residual_risks: string[];
}

/**
 * A single actionable item the producer needs to address for a scene. The
 * producer report differs from the broker-facing compliance report by giving
 * the line producer concrete, scene-by-scene next steps rather than a formal
 * legal statement.
 */
export interface ProducerSceneAction {
  scene_id?: number | null;
  /** Backend may return a scene order index instead of the PK during rollout. */
  scene_order?: number | null;
  heading?: string;
  /** Top-line "what's risky here" summary the producer can read in 5 seconds. */
  summary: string;
  /** Specific, ranked action items (e.g. "Hire stunt coordinator", "Notify EMS"). */
  action_items: string[];
  /** Optional severity hint for badge colouring; falls back to neutral if absent. */
  severity?: Severity | null;
}

/**
 * Producer-facing operational counterpart to `ComplianceReport`. Generated by
 * the backend at finalize alongside the insurance report. Every section is
 * optional during rollout because earlier finalized analyses won't carry it.
 */
export interface ProducerReport {
  executive_summary: string;
  top_risks_to_address: string[];
  scene_by_scene_priorities: ProducerSceneAction[];
  pre_production_checklist: string[];
  daily_safety_briefings: string[];
  additional_crew_recommendations: string[];
  /** Optional equipment checklist surfaced as a separate group when present. */
  equipment_checklist?: string[];
}

// ── Credits / estimate ──────────────────────────────────────────────────────
export interface CreditEstimate {
  estimated_credits: number;
  estimated_calls: number;
  estimated_minutes: number;
}

// ── Status payload (GET /status/) ───────────────────────────────────────────
export interface RiskAnalysisStatusPayload {
  status: RiskAnalysisStatus | RiskAnalysisStatusLower;
  progress: number;
  scenes_processed: number;
  scenes_total: number;
  task_status?: string;
  drift_warnings?: DriftWarning[];
  /**
   * Optional server-side stalled hint emitted by the backend watchdog
   * (~2 min cadence). When `true`, the dashboard should surface a recovery
   * banner. The frontend also computes its own stalled signal as a fallback
   * for when this field is missing — see `useRiskAnalysisPolling`.
   */
  is_stalled?: boolean;
  /** Seconds the analysis has been without observable progress (server-reported). */
  stalled_seconds?: number;
}

// ── List entry (GET /scripts/<id>/risk-analyses/) ───────────────────────────
export interface RiskAnalysisListItem {
  id: number;
  script_id: number;
  status: RiskAnalysisStatus | RiskAnalysisStatusLower;
  score?: number | null;
  score_band?: ScoreBand | null;
  created_at: string;
  finalized_at?: string | null;
  registry_version?: string | null;
}

// ── Start response (POST /start/) ───────────────────────────────────────────
export interface StartAnalysisResponse {
  analysis_id: number;
  task_id: string;
  status: RiskAnalysisStatus | RiskAnalysisStatusLower;
  estimate?: CreditEstimate;
}

// ── Full dashboard payload (GET /results/) ──────────────────────────────────
export interface RiskAnalysis {
  /** Some endpoints include `id`, others rely on the URL — keep optional. */
  id?: number;
  status?: RiskAnalysisStatus | RiskAnalysisStatusLower;
  score: number;
  score_band: ScoreBand;
  insurance: RiskInsurance;
  edit_summary: RiskEditSummary;
  scenes: RiskScene[];
  summary_stats: RiskSummaryStats;
  graph: RiskGraph;
  compliance_report?: ComplianceReport | null;
  /**
   * Insurance/broker-facing report. Alias of `compliance_report` during the
   * dual-report rollout — treat them as equivalent. Either one may be
   * present; the UI should fall back to whichever it finds first.
   */
  insurance_report?: ComplianceReport | null;
  /** Producer-facing operational report — landed alongside insurance at finalize. */
  producer_report?: ProducerReport | null;
  finalized_pdf_url?: string | null;
  /** Producer PDF URL when present (alias endpoint exists for back-compat). */
  producer_pdf_url?: string | null;
  finalized_at?: string | null;
  finalized_score?: number | null;
  category_breakdown?: RiskCategoryBreakdown[];
  credits_consumed_by_phase?: Record<string, number>;
  drift_warnings?: DriftWarning[];
  registry_version?: string;
  /** Top-level findings counters (optional during backend rollout). */
  total_findings_count?: number;
  scenes_with_findings_count?: number;
  /** Only populated when `status == "CANCELLED"`. */
  cancelled_context?: CancelledContext | null;
}

// ── Typed API error returns for component-level handling ───────────────────
export type RiskApiErrorCode =
  | "insufficient_credits"
  | "max_scenes_exceeded"
  | "finalized_readonly"
  | "payload_too_large"
  | "unsupported_media"
  | "content_type_mismatch"
  | "throttled"
  | "not_cancellable"
  | "forbidden"
  | "unknown";

export interface RiskApiError {
  ok: false;
  code: RiskApiErrorCode;
  status?: number;
  message: string;
  /** Server-provided payload (e.g. shortfall info for 402). */
  detail?: Record<string, unknown>;
  /** From `Retry-After` header on 429, in seconds. */
  retry_after?: number;
}

export interface RiskApiSuccess<T> {
  ok: true;
  data: T;
}

export type RiskApiResult<T> = RiskApiSuccess<T> | RiskApiError;

// ── Edit payloads ──────────────────────────────────────────────────────────
export interface CreateFindingBody {
  category_slug: string;
  severity: Severity;
  reason: string;
  evidence_quote?: string;
}

export interface PatchFindingBody {
  category_slug?: string;
  severity?: Severity;
  reason?: string;
  evidence_quote?: string;
}

export interface PatchMitigationBody {
  recommendation?: string;
  equipment_needed?: string;
  personnel_required?: string;
}

export interface CreateMitigationBody {
  recommendation: string;
  equipment_needed?: string;
  personnel_required?: string;
}

/**
 * Response payload for `POST .../cancel/`. Per Plan §8.10, credits already
 * consumed on a cancel are NOT refunded — `credits_refunded` is always 0
 * today, but the field is kept so a future refund policy can populate it
 * without a contract bump.
 */
export interface CancelResponse {
  status: "CANCELLED";
  credits_refunded: number;
}

export interface CancelAnalysisBody {
  reason?: string;
}

export interface StartAnalysisBody {
  mitigations_text?: string;
  /** Optional pre-flight evidence docs — multipart only. */
  mitigations_docs?: File[];
}

// ── Convenience helpers ────────────────────────────────────────────────────
/** Normalise a status string to upper-case form regardless of backend casing. */
export function normaliseStatus(
  s: RiskAnalysisStatus | RiskAnalysisStatusLower | string | undefined | null,
): RiskAnalysisStatus | null {
  if (!s) return null;
  return s.toUpperCase() as RiskAnalysisStatus;
}

/**
 * Truly terminal pipeline states — these are the ones where the analysis
 * envelope is frozen and no further backend transitions are expected. Polling
 * should only consider stopping on these.
 *
 * NOTE: ``AWAITING_APPROVAL`` is intentionally NOT here. It's a user-action
 * waiting state — the user is about to click Finalize, which kicks the
 * pipeline back into ``FINALIZING → FINALIZED`` asynchronously. If we treat
 * it as terminal, polling stops and never refreshes the envelope after
 * finalize completes (the original Bug B). ``FINALIZING`` is also not
 * terminal — it's an in-flight Celery task that must be polled through.
 */
export const TERMINAL_STATUSES: RiskAnalysisStatus[] = [
  "FINALIZED",
  "FAILED",
  "CANCELLED",
];

export function isTerminal(
  s: RiskAnalysisStatus | RiskAnalysisStatusLower | string | undefined | null,
): boolean {
  const n = normaliseStatus(s);
  return n !== null && TERMINAL_STATUSES.includes(n);
}
