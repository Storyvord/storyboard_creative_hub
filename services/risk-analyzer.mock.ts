// Sample payloads pulled from `creative_hub/risk/FRONTEND_INTEGRATION.md`
// §9.3 / §9.4. Imported by component tests / Storybook-style smoke harnesses
// (no runtime usage from the real app).

import {
  RiskAnalysis,
  RiskAnalysisListItem,
  RiskAnalysisStatusPayload,
} from "@/types/risk-analyzer";

export const MOCK_STATUS_CLASSIFYING: RiskAnalysisStatusPayload = {
  status: "classifying",
  progress: 0.46,
  scenes_processed: 11,
  scenes_total: 24,
  task_status: "STARTED",
};

/**
 * Sample stalled status — the analysis row is still in PENDING but the
 * watchdog has flagged it because no progress has been observed for over
 * 2 minutes. Reviewers can wire this into the dashboard to verify the
 * `<StalledBanner>` renders.
 */
export const MOCK_STATUS_STALLED: RiskAnalysisStatusPayload = {
  status: "pending",
  progress: 0.0,
  scenes_processed: 0,
  scenes_total: 24,
  task_status: "PENDING",
  is_stalled: true,
  stalled_seconds: 187,
};

/**
 * Sample terminal-CANCELLED status — the user (or an admin) hit the
 * `POST cancel/` endpoint while the run was in CLASSIFYING. Credits already
 * consumed are NOT refunded per Plan §8.10.
 */
export const MOCK_STATUS_CANCELLED: RiskAnalysisStatusPayload = {
  status: "cancelled",
  progress: 0.32,
  scenes_processed: 8,
  scenes_total: 24,
  task_status: "REVOKED",
};

export const MOCK_STATUS_FAILED: RiskAnalysisStatusPayload = {
  status: "failed",
  progress: 0.0,
  scenes_processed: 7,
  scenes_total: 24,
  task_status: "FAILURE",
  drift_warnings: [
    {
      kind: "finalize_credits_exhausted",
      payload: { error: "Insufficient credits to make this request" },
      at: "2026-05-12T10:14:22Z",
    },
  ],
};

export const MOCK_RESULTS_AWAITING_APPROVAL: RiskAnalysis = {
  status: "awaiting_approval",
  score: 712,
  score_band: "Medium",
  insurance: {
    tier: "Elevated",
    multiplier: 1.42,
    premium_low_k: 14.2,
    premium_high_k: 21.3,
    tier_riders: "weapons rider, stunt waiver",
    risk_level: 0.21,
  },
  edit_summary: {
    ai_findings_count: 12,
    user_added_count: 3,
    user_modified_count: 1,
    user_deleted_count: 2,
    ai_only_score: 690,
    current_score: 712,
    delta: 22,
  },
  scenes: [
    {
      scene_id: 41,
      heading: "INT. WAREHOUSE - NIGHT",
      order: 1,
      cumulative_deduction: 12.6,
      projected_score: 770,
      exposure_contribution: 12.6,
      severity_breakdown: { Critical: 1, High: 0, Medium: 0, Low: 0 },
      findings: [
        {
          id: 555,
          category: "Explosions / Pyrotechnics",
          category_slug: "explosions",
          severity: "Critical",
          reason: "Practical pyrotechnic charge near actor.",
          evidence_quote: "the charge detonates as JACK rolls clear",
          confidence: "high",
          source: "ai",
          audit_flags: [],
          approval_state: "none",
          deleted_by_user: false,
        },
      ],
      mitigations: [
        {
          finding_id: 555,
          recommendation: "Engage a certified pyrotechnician.",
          equipment_needed: "Blast mats, fire extinguishers",
          personnel_required: "Pyrotechnician + safety officer",
          source: "ai",
          evidence_file_url: null,
        },
      ],
    },
  ],
  summary_stats: {
    total_scenes_parsed: 24,
    scenes_analysed: 11,
    scenes_approved: 0,
    total_risks_found: 16,
    severity_distribution: { Critical: 2, High: 5, Medium: 6, Low: 3 },
  },
  graph: {
    nodes: [
      {
        id: "scene_41",
        label: "INT. WAREHOUSE - NIGHT",
        group: "scene",
        color: "#ef4444",
        size: 28,
        risk_count: 1,
      },
      {
        id: "risk_explosions",
        label: "Explosions / Pyrotechnics",
        group: "risk",
        color: "#6366f1",
        size: 14,
        severity: "Critical",
      },
    ],
    edges: [
      {
        source: "scene_41",
        target: "risk_explosions",
        label: "critical",
        severity: "Critical",
      },
    ],
    legend: [
      { group: "scene", label: "Scene", color_by_severity: true },
      { group: "risk", label: "Risk category", color: "#6366f1" },
    ],
    score_band: "Medium",
  },
  finalized_pdf_url: null,
  drift_warnings: [],
};

export const MOCK_ANALYSES: RiskAnalysisListItem[] = [
  {
    id: 42,
    script_id: 1,
    status: "AWAITING_APPROVAL",
    score: 712,
    score_band: "Medium",
    created_at: "2026-05-12T10:00:00Z",
  },
  {
    id: 41,
    script_id: 1,
    status: "FINALIZED",
    score: 690,
    score_band: "Medium",
    created_at: "2026-05-10T08:30:00Z",
    finalized_at: "2026-05-10T09:00:00Z",
  },
];
