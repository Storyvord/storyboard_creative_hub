export interface Script {
  id: number;
  title: string;
  content: string;
  file: string; // URL
  suggestions: any[];
  analysis?: any;
  aspect_ratio?: string;
  storyboarding_type?: 'sketch' | 'storyboard' | 'hd' | 'anime';
  uploaded_at: string;
  task_id?: string;
  requires_confirmation?: boolean;
  review_status?: string;
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
  dialog_count?: number;
  set_number?: number;
  date?: string;
  timeline?: any;
  scene_characters?: any[];
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
}

export interface Location {
  id: number;
  script: number;
  name: string;
  description?: string;
  time?: string;
  image_url?: string;
}

export interface Cloth {
  id: number;
  name: string;
  description?: string;
  cloth_type: string;
  image_url?: string;
}

export interface Previsualization {
  id: number;
  script?: number;
  description?: string;
  image_url?: string;
  audio_url?: string;
  aspect_ratio?: string;
  camera_angle?: string;
  added_by?: {
      id: number;
      name: string;
      email: string;
  } | null;
  assignment_date?: string | null;
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
    lighting?: string;
    rationale?: string;
    timeline?: any;
    previz?: Previsualization; // Nested previz object
    [key: string]: any;
}
