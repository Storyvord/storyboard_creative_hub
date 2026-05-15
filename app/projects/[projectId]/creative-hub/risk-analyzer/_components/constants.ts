// Shared constants for the Risk Analyzer UI. Slug → label list mirrors the
// 43-category registry fixture (`creative_hub/fixtures/risk_registry_v1.json`)
// so edit modals can render category dropdowns without a network round trip.
// If a future registry version adds slugs, the backend echoes the registry
// version on the results envelope — the dropdown gracefully falls back to
// "unknown slug → titleized label".

import { Severity, ScoreBand, Source } from "@/types/risk-analyzer";

export const RISK_CATEGORIES: Array<{ slug: string; label: string }> = [
  { slug: "stunts", label: "Stunts" },
  { slug: "vehicle_chase", label: "Vehicle Chase" },
  { slug: "explosions", label: "Explosions" },
  { slug: "fire_pyrotechnics", label: "Fire / Pyrotechnics" },
  { slug: "water_scenes_underwater", label: "Water Scenes / Underwater" },
  { slug: "aircraft_helicopters", label: "Aircraft / Helicopters" },
  { slug: "drones_uavs", label: "Drones / UAVs" },
  { slug: "animals_wildlife", label: "Animals / Wildlife" },
  { slug: "weapons_firearms", label: "Weapons / Firearms" },
  { slug: "rigging_scaffolding_heights", label: "Rigging / Scaffolding / Heights" },
  { slug: "mechanical_effects_animatronics", label: "Mechanical Effects / Animatronics" },
  { slug: "fight_choreography", label: "Fight Choreography" },
  { slug: "watercraft_marine_operations", label: "Watercraft / Marine Operations" },
  { slug: "night_shoot_low_visibility", label: "Night Shoot / Low Visibility" },
  { slug: "hazardous_environment", label: "Hazardous Environment" },
  { slug: "extreme_weather_storms", label: "Extreme Weather / Storms" },
  { slug: "extreme_temperature", label: "Extreme Temperature" },
  { slug: "remote_wilderness_locations", label: "Remote / Wilderness Locations" },
  { slug: "confined_spaces", label: "Confined Spaces" },
  { slug: "foreign_international_locations", label: "Foreign / International Locations" },
  { slug: "historic_heritage_locations", label: "Historic / Heritage Locations" },
  { slug: "private_property_trespassing", label: "Private Property / Trespassing" },
  { slug: "street_closures_public_disruption", label: "Street Closures / Public Disruption" },
  { slug: "high_altitude_mountain", label: "High Altitude / Mountain" },
  { slug: "child_actors_minors", label: "Child Actors / Minors" },
  { slug: "crowd_scenes_extras_control", label: "Crowd Scenes / Extras Control" },
  { slug: "intimacy_nudity", label: "Intimacy / Nudity" },
  { slug: "cast_illness_injury", label: "Cast Illness / Injury" },
  { slug: "key_personnel_dependency", label: "Key Personnel Dependency" },
  { slug: "labor_disputes_strikes", label: "Labor Disputes / Strikes" },
  { slug: "trademark_copyright_visibility", label: "Trademark / Copyright Visibility" },
  { slug: "defamation_real_name_likeness", label: "Defamation / Real-Name Likeness" },
  { slug: "bystander_privacy_hidden_cameras", label: "Bystander Privacy / Hidden Cameras" },
  { slug: "communicable_disease_health_hazards", label: "Communicable Disease / Health Hazards" },
  { slug: "permits_regulatory_compliance", label: "Permits / Regulatory Compliance" },
  { slug: "civil_authority_government_intervention", label: "Civil Authority / Government Intervention" },
  { slug: "extortion_threats_against_production", label: "Extortion / Threats Against Production" },
  { slug: "faulty_production_media_data_loss", label: "Faulty Production Media / Data Loss" },
  { slug: "malicious_programming_cyber_attack", label: "Malicious Programming / Cyber Attack" },
  { slug: "equipment_failure_breakdown", label: "Equipment Failure / Breakdown" },
  { slug: "power_utilities_failure", label: "Power / Utilities Failure" },
  { slug: "third_party_property_damage", label: "Third-Party Property Damage" },
  { slug: "care_custody_control_liability", label: "Care, Custody, Control Liability" },
];

export const RISK_CATEGORY_BY_SLUG: Record<string, string> = RISK_CATEGORIES.reduce<
  Record<string, string>
>((acc, c) => {
  acc[c.slug] = c.label;
  return acc;
}, {});

// Severity palette per FRONTEND_INTEGRATION.md §6 (graph palette) and §11.3
// (scene severity bars).
export const SEVERITY_COLOR: Record<Severity, string> = {
  Critical: "#ef4444",
  High: "#ea580c",
  Medium: "#f59e0b",
  Low: "#10b981",
};

// Score gauge palette — three bucket boundaries per §5.
export const SCORE_BAND_COLOR: Record<ScoreBand, string> = {
  Low: "#ef4444", // <650
  Medium: "#f59e0b", // 650–849
  High: "#10b981", // ≥850
};

export function scoreColor(score: number): string {
  if (score >= 850) return "#10b981";
  if (score >= 650) return "#f59e0b";
  return "#ef4444";
}

export function scoreBandFromScore(score: number): ScoreBand {
  if (score >= 850) return "High";
  if (score >= 650) return "Medium";
  return "Low";
}

export const SEVERITIES: Severity[] = ["Critical", "High", "Medium", "Low"];

// Edit-affordance badge metadata per §7.
export interface SourceBadge {
  label: string;
  color: string;
  bg: string;
}

export const SOURCE_BADGE: Partial<Record<Source, SourceBadge>> = {
  user_modified: { label: "Modified", color: "#facc15", bg: "rgba(250,204,21,0.12)" },
  user_added: { label: "Added", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  ai_critic: { label: "Critic flag", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  ai_metadata_rule: { label: "Rule", color: "#64748b", bg: "rgba(100,116,139,0.12)" },
};

export const APPROVED_BADGE = {
  label: "Approved",
  color: "#16a34a",
  bg: "rgba(22,163,74,0.12)",
};

export function categoryLabel(slug: string, fallback?: string): string {
  return RISK_CATEGORY_BY_SLUG[slug] ?? fallback ?? slug;
}
