import api from "./api";
import { Project } from "@/types/project";

export const getProjects = async (): Promise<Project[]> => {
  const response = await api.get("/api/project/v2/projects/");
  // Adjust based on actual API response structure (pagination, data wrapper, etc.)
  // Assuming list for now, but usually DRF returns { results: [...] } or just [...]
  // Based on ProjectListCreateView, it likely returns a list or paginated list.
  
  if (Array.isArray(response.data)) {
      return response.data;
  } else if (response.data.results) {
      return response.data.results;
  }
  return [];
};
