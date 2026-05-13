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
  | "FAILED";

/** Lowercase variant used by some backend status payloads (`/status/`). */
export type RiskAnalysisStatusLower =
  | "pending"
  | "classifying"
  | "mitigating"
  | "awaiting_approval"
  | "finalizing"
  | "finalized"
  | "failed";

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
}

// ── Summary stats / category breakdown ──────────────────────────────────────
export interface RiskSummaryStats {
  total_scenes_parsed: number;
  scenes_analysed: number;
  scenes_approved: number;
  total_risks_found: number;
  severity_distribution: RiskSeverityBreakdown;
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

// ── Compliance ──────────────────────────────────────────────────────────────
export interface ComplianceReport {
  executive_summary: string;
  compliance_statement: string;
  mitigation_verification: string;
  residual_risks: string[];
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
  finalized_pdf_url?: string | null;
  finalized_at?: string | null;
  finalized_score?: number | null;
  category_breakdown?: RiskCategoryBreakdown[];
  credits_consumed_by_phase?: Record<string, number>;
  drift_warnings?: DriftWarning[];
  registry_version?: string;
}

// ── Typed API error returns for component-level handling ───────────────────
export type RiskApiErrorCode =
  | "insufficient_credits"
  | "max_scenes_exceeded"
  | "finalized_readonly"
  | "payload_too_large"
  | "unsupported_media"
  | "throttled"
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

export const TERMINAL_STATUSES: RiskAnalysisStatus[] = [
  "FINALIZED",
  "FAILED",
  "AWAITING_APPROVAL",
];

export function isTerminal(
  s: RiskAnalysisStatus | RiskAnalysisStatusLower | string | undefined | null,
): boolean {
  const n = normaliseStatus(s);
  return n !== null && TERMINAL_STATUSES.includes(n);
}
