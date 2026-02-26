export interface Script {
  id: number;
  title: string;
  content: string;
  file: string; // URL
  suggestions: any[];
  analysis?: any;
  aspect_ratio?: string;
  uploaded_at: string;
}

export interface Scene {
  id: number;
  scene_name: string;
  description: string;
  order: number;
  location?: string;
  int_ext?: string;
  time?: string;
  scene_characters?: any[];
  [key: string]: any;
}

export interface Character {
  id: number;
  name: string;
  description?: string;
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
