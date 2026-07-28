/**
 * Storyboarding styles, mirroring `STORYBOARDING_TYPE_CHOICES` in the backend's
 * `creative_hub/models.py`. Import this type instead of re-declaring the union —
 * it was previously spelled out in six places and every one of them went stale
 * when a style was added.
 */
export type StoryboardingType =
  | 'sketch'
  | 'storyboard'
  | 'hd'
  | 'anime'
  | 'pixar'
  | 'comic'
  | 'watercolor'
  | 'noir';

/** Display order and labels for the style pickers. */
export const STORYBOARDING_TYPES: { value: StoryboardingType; label: string }[] = [
  { value: 'sketch', label: 'Sketch' },
  { value: 'storyboard', label: 'Storyboard' },
  { value: 'hd', label: 'HD' },
  { value: 'anime', label: 'Anime' },
  { value: 'pixar', label: '3D Animation' },
  { value: 'comic', label: 'Comic Book' },
  { value: 'watercolor', label: 'Watercolor' },
  { value: 'noir', label: 'Film Noir' },
];

export interface TaskStatusRecord {
  id: number;
  task_id: string;
  task_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying' | 'started';
  object_id: number;
  error: string | null;
  progress_message: string | null;
  progress_current: number;
  progress_total: number;
  created_at: string;
  updated_at: string;
}

/** One entry in scene_breakdown — per-scene dialogue/character counts. */
export interface SceneBreakdownEntry {
  scene_number: number;
  scene_label: string;   // e.g. "S1"
  heading: string;       // truncated scene heading
  characters: number;
  dialogues: number;
  actions: number;
}

/** Shape of the character_appearances map value. */
export interface CharacterAppearance {
  count: number;
  percentage: number;
}

/**
 * Script analysis computed by analyze_fdx() and stored in script.analysis on
 * every content save. This is the single source of truth for all analytics —
 * nothing is re-derived client-side from the scenes array.
 */
export interface ScriptAnalysis {
  scene_count: number;
  character_count: number;
  action_vs_dialogue: { Action: number; Dialogue: number };
  interior_vs_exterior: { Interior: number; Exterior: number };
  /** character name → percentage share of total dialogue lines */
  dialogue_distribution: Record<string, number>;
  /** location name → percentage of total scene count */
  setting_distribution: Record<string, number>;
  character_appearances: Record<string, CharacterAppearance>;
  scene_breakdown: SceneBreakdownEntry[];
  /** Snapshot of the structured instruction used to generate this script (if AI-generated). */
  script_generation?: {
    instruction: Record<string, unknown>;
    requested_scene_count?: number | null;
  };
  /** V3 conversion draft metadata. */
  v3_conversion_draft?: Record<string, unknown>;
}

export interface Script {
  id: number;
  title: string;
  content: string;
  file: string; // URL
  suggestions: unknown[];
  analysis?: ScriptAnalysis;
  aspect_ratio?: string;
  storyboarding_type?: StoryboardingType;
  uploaded_at: string;
  updated_at?: string;
  task_id?: string;
  requires_confirmation?: boolean;
  review_status?: string;
  /** Pre-computed scene diff stored on script save; null after sync is applied */
  sync_diff?: SceneSyncDiff | null;
}

export interface Scene {
  id: number;
  scene_name: string;
  description: string;
  order: number;
  location?: string;
  location_detail?: Location | null;
  int_ext?: string;
  /** Time-of-day extracted from FDX (e.g. "DAY", "NIGHT") */
  environment?: string;
  /** SHA-256 hash of canonical scene content for change detection */
  scene_hash?: string;
  /** True when scene content was edited after shots were generated */
  shots_stale?: boolean;
  dialog_count?: number;
  set_number?: number;
  date?: string;
  timeline?: any;
  scene_characters?: any[];
  /** Backend-computed sync status relative to current FDX content */
  sync_status?: 'unchanged' | 'updated' | 'deleted' | 'new';
  /** List of changed fields (e.g. ['action', 'location']) when sync_status is 'updated' */
  sync_changes?: string[];
  /** Number of shots that would be deleted if this scene is removed */
  sync_shot_count?: number;
  /** Per-scene style override; null means inherit from script/project level */
  storyboarding_type?: StoryboardingType | null;
  /** Always-resolved effective style (never null) */
  effective_storyboarding_type?: StoryboardingType;
  [key: string]: any;
}

export interface SceneSyncDiff {
  new_scenes: { order: number; scene_name: string; description: string; location: string; int_ext: string; environment: string }[];
  updated_scenes: { scene_id: number; order: number; scene_name: string; changes: string[]; shot_count: number }[];
  unchanged_scenes: { scene_id: number; order: number; scene_name: string }[];
  deleted_scenes: { scene_id: number; order: number; scene_name: string; shot_count: number }[];
}

export interface Character {
  id: number;
  name: string;
  description?: string;
  image_url?: string;
  active_previz?: number | null;
}

export interface Location {
  id: number;
  script: number;
  name: string;
  description?: string;
  time?: string;
  image_url?: string;
  active_previz?: number | null;
}

export interface SceneCharacter {
  id: number;
  scene?: number;
  character?: { id: number; name: string; image_url?: string } | null;
  character_name?: string;
  image_url?: string;
  active_previz?: number | null;
  cloths?: Cloth[];
  notes?: string;
  [key: string]: unknown;
}

export interface Cloth {
  id: number;
  name: string;
  description?: string;
  cloth_type: string;
  image_url?: string;
}

export interface ReferenceImage {
  type: 'character' | 'scene_character' | 'location';
  id: number;
  image_url: string;
}

export interface Previsualization {
  id: number;
  script?: number;
  description?: string;
  image_url?: string;
  audio_url?: string;
  aspect_ratio?: string;
  camera_angle?: string;
  shot_type?: string;
  added_by?: {
      id: number;
      name: string;
      email: string;
  } | null;
  assignment_date?: string | null;
  reference_images?: ReferenceImage[];
  [key: string]: any;
}

export interface Shot {
    id: number;
    scene?: number;
    description: string;
    type: string;
    order: number;
    image_url?: string; // from previz
    // Extended fields for details
    movement?: string;
    camera_angle?: string;
    shot_type?: string;
    lighting?: string;
    rationale?: string;
    timeline?: any;
    previz?: Previsualization; // Nested previz object
    [key: string]: any;
}
