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

/**
 * Sample CANCELLED envelope with partial findings retained. Exercises the
 * new producer-facing UX: the cancelled-state banner offers a "Finalize
 * partial analysis" CTA because
 * `cancelled_context.finalize_available_from_cancelled` is true, and the
 * Overview panel reports the real (non-zero) counts rather than the old
 * "every-scene-equals-max-score" misleading default.
 */
export const MOCK_STATUS_CANCELLED_WITH_FINDINGS: RiskAnalysis = {
  status: "cancelled",
  score: 745,
  score_band: "Medium",
  insurance: {
    tier: "Elevated",
    multiplier: 1.31,
    premium_low_k: 11.5,
    premium_high_k: 17.8,
    tier_riders: "stunt waiver",
    risk_level: 0.18,
  },
  edit_summary: {
    ai_findings_count: 4,
    user_added_count: 0,
    user_modified_count: 0,
    user_deleted_count: 0,
    ai_only_score: 745,
    current_score: 745,
    delta: 0,
  },
  scenes: [
    {
      scene_id: 91,
      heading: "EXT. ROOFTOP - DAY",
      order: 1,
      cumulative_deduction: 9.4,
      projected_score: 805,
      exposure_contribution: 9.4,
      severity_breakdown: { Critical: 0, High: 1, Medium: 1, Low: 0 },
      has_findings: true,
      findings: [
        {
          id: 901,
          category: "Rigging / Scaffolding / Heights",
          category_slug: "rigging_scaffolding_heights",
          severity: "High",
          reason: "Actor traversing a 12-storey rooftop edge.",
          evidence_quote: "JACK leaps to the next building",
          confidence: "high",
          source: "ai",
          audit_flags: [],
          approval_state: "none",
          deleted_by_user: false,
        },
        {
          id: 902,
          category: "Crowd Scenes / Extras Control",
          category_slug: "crowd_scenes_extras_control",
          severity: "Medium",
          reason: "Street-level extras observe the stunt.",
          evidence_quote: "the crowd below gasps",
          confidence: "medium",
          source: "ai",
          audit_flags: [],
          approval_state: "none",
          deleted_by_user: false,
        },
      ],
      mitigations: [],
    },
    {
      scene_id: 92,
      heading: "INT. LOBBY - DAY",
      order: 2,
      cumulative_deduction: 0,
      projected_score: 745,
      exposure_contribution: 0,
      severity_breakdown: { Critical: 0, High: 0, Medium: 0, Low: 0 },
      has_findings: false,
      findings: [],
      mitigations: [],
    },
  ],
  summary_stats: {
    total_scenes_parsed: 24,
    scenes_analysed: 6,
    scenes_approved: 0,
    total_risks_found: 3,
    severity_distribution: { Critical: 0, High: 1, Medium: 2, Low: 0 },
    is_empty: false,
  },
  graph: { nodes: [], edges: [], legend: [], score_band: "Medium" },
  finalized_pdf_url: null,
  drift_warnings: [],
  total_findings_count: 3,
  scenes_with_findings_count: 1,
  cancelled_context: {
    findings_count: 3,
    finalize_available_from_cancelled: true,
  },
};

/**
 * Sample FINALIZED envelope with BOTH reports populated. Drives the
 * dual-report Reports tab in component tests / Storybook so reviewers can
 * verify the Insurance | Producer segmented control and click-throughs
 * end-to-end without a live backend.
 */
export const MOCK_RESULTS_FINALIZED_DUAL_REPORT: RiskAnalysis = {
  id: 41,
  status: "finalized",
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
      order: 12,
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
          approval_state: "agreed",
          deleted_by_user: false,
        },
      ],
      mitigations: [],
    },
    {
      scene_id: 42,
      heading: "EXT. ROOFTOP - NIGHT",
      order: 24,
      cumulative_deduction: 9.4,
      projected_score: 760,
      exposure_contribution: 9.4,
      severity_breakdown: { Critical: 0, High: 1, Medium: 0, Low: 0 },
      findings: [
        {
          id: 556,
          category: "Rigging / Scaffolding / Heights",
          category_slug: "rigging_scaffolding_heights",
          severity: "High",
          reason: "Actor near rooftop edge without harness specified.",
          evidence_quote: "JACK leaps to the next building",
          confidence: "high",
          source: "ai",
          audit_flags: [],
          approval_state: "none",
          deleted_by_user: false,
        },
      ],
      mitigations: [],
    },
  ],
  summary_stats: {
    total_scenes_parsed: 24,
    scenes_analysed: 24,
    scenes_approved: 24,
    total_risks_found: 2,
    severity_distribution: { Critical: 1, High: 1, Medium: 0, Low: 0 },
    is_empty: false,
  },
  graph: { nodes: [], edges: [], legend: [], score_band: "Medium" },
  compliance_report: {
    executive_summary:
      "Production risk profile is Elevated, driven by one pyrotechnic charge and one rooftop traversal. All identified hazards have approved mitigations.",
    compliance_statement:
      "This analysis confirms the production complies with industry safety expectations for Tier-Elevated coverage. All required riders are in place.",
    mitigation_verification:
      "Pyrotechnic charge in Scene 12 will be supervised by a certified pyrotechnician with blast mats and EMS standby. Rooftop traversal in Scene 24 requires harness, safety rigger, and stunt coordinator approval.",
    residual_risks: [
      "Weather may impact rooftop scheduling — keep an interior backup.",
      "Pyro permits subject to local fire marshal sign-off.",
    ],
  },
  insurance_report: {
    executive_summary:
      "Production risk profile is Elevated, driven by one pyrotechnic charge and one rooftop traversal. All identified hazards have approved mitigations.",
    compliance_statement:
      "This analysis confirms the production complies with industry safety expectations for Tier-Elevated coverage. All required riders are in place.",
    mitigation_verification:
      "Pyrotechnic charge in Scene 12 will be supervised by a certified pyrotechnician with blast mats and EMS standby. Rooftop traversal in Scene 24 requires harness, safety rigger, and stunt coordinator approval.",
    residual_risks: [
      "Weather may impact rooftop scheduling — keep an interior backup.",
      "Pyro permits subject to local fire marshal sign-off.",
    ],
  },
  producer_report: {
    executive_summary:
      "Two high-severity hazards drive this shoot's risk: a pyrotechnic charge on day 4 and a rooftop traversal on day 8. Both need a dedicated safety coordinator and rehearsal blocks the day before.",
    top_risks_to_address: [
      "Pyrotechnic charge in Scene 12 — book pyrotechnician and EMS standby a week ahead.",
      "Rooftop traversal in Scene 24 — secure harness rigging, lock building permits, schedule weather backup.",
    ],
    scene_by_scene_priorities: [
      {
        scene_id: 41,
        scene_order: 12,
        heading: "Scene 12 · INT. WAREHOUSE - NIGHT",
        summary:
          "Practical pyrotechnic charge near actor. Highest-severity item on the schedule.",
        severity: "Critical",
        action_items: [
          "Hire a certified pyrotechnician (confirm SAG/IATSE credentials).",
          "Position blast mats and class-A fire extinguishers within 5m of the charge.",
          "Brief EMS standby; confirm radio channel + nearest hospital ETA.",
          "Rehearse JACK's roll-clear at half speed before live charge.",
        ],
      },
      {
        scene_id: 42,
        scene_order: 24,
        heading: "Scene 24 · EXT. ROOFTOP - NIGHT",
        summary:
          "Actor traversing rooftop edge — requires harness rigging and stunt coordinator sign-off.",
        severity: "High",
        action_items: [
          "Engage a certified rigger to set safety lines.",
          "Stunt coordinator must walk the route + sign off prior to shooting.",
          "Lock weather backup interior; check forecast 48h ahead.",
        ],
      },
    ],
    pre_production_checklist: [
      "Confirm pyrotechnic permits with city fire marshal.",
      "Walk rooftop location with stunt coordinator and rigger.",
      "Schedule rehearsal block T-1 day for both high-severity scenes.",
      "Distribute safety briefing pack to all department heads.",
    ],
    equipment_checklist: [
      "Blast mats (×4) and class-A extinguishers (×6).",
      "Full-body harnesses + redundant safety lines for rooftop work.",
      "Two-way radios for safety officer ↔ AD on pyro day.",
      "First-aid kit + AED on set both days.",
    ],
    daily_safety_briefings: [
      "Day 4 (pyro): 10-minute briefing — clearance distances, abort signal, emergency procedure.",
      "Day 8 (rooftop): 15-minute briefing — harness inspection, fall-arrest plan, weather call.",
    ],
    additional_crew_recommendations: [
      "+1 dedicated safety officer for the duration of the shoot.",
      "+1 medic on-set for both high-severity shoot days.",
      "Stunt coordinator booked for prep + Scene 24 only.",
    ],
  },
  finalized_pdf_url: null,
  producer_pdf_url: null,
  finalized_at: "2026-05-10T09:00:00Z",
  finalized_score: 712,
  drift_warnings: [],
  total_findings_count: 2,
  scenes_with_findings_count: 2,
};

// ---------------------------------------------------------------------------
// Smoke-test sample data — STO-1369 ReportsTab cascade fix.
// ---------------------------------------------------------------------------
//
// Use these envelopes when manually verifying that ReportsTab renders the
// dual-report view unconditionally on FINALIZED. The expected behaviour:
//
//   1. ``MOCK_RESULTS_FINALIZED_DUAL_REPORT`` (above) — both reports
//      present, status FINALIZED → Insurance | Producer toggle visible,
//      Insurance view default, no "Reports not generated yet" message.
//   2. ``MOCK_RESULTS_FINALIZED_INSURANCE_ONLY`` — legacy snapshot with
//      only insurance_report, status FINALIZED → no toggle, single
//      Insurance view, no loader.
//   3. ``MOCK_RESULTS_FINALIZED_PRODUCER_ONLY`` — defensive fallback
//      (shouldn't happen in practice; insurance is mandatory) → no
//      toggle, single Producer view, no loader.
//
// These envelopes are imported by Storybook / manual QA pages. Vitest
// is not configured in this repo, so a Vitest-style test isn't shipped;
// see /Users/kaushik/Projects/Intern/creative_hub_frontend/.harness for
// the QA checklist that exercises these against ReportsTab.

export const MOCK_RESULTS_FINALIZED_INSURANCE_ONLY: RiskAnalysis = {
  ...MOCK_RESULTS_FINALIZED_DUAL_REPORT,
  id: 91,
  // Legacy snapshot: producer_report key absent from the envelope.
  producer_report: null,
  producer_pdf_url: null,
};

export const MOCK_RESULTS_FINALIZED_PRODUCER_ONLY: RiskAnalysis = {
  ...MOCK_RESULTS_FINALIZED_DUAL_REPORT,
  id: 92,
  insurance_report: null,
  compliance_report: null,
  finalized_pdf_url: null,
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
