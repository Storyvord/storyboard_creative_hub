export interface Project {
  project_id: string; // uuid
  name: string;
  description?: string;
  [key: string]: any;
}
