"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProjects } from "@/services/project";
import { Project } from "@/types/project";
import { logout } from "@/services/auth";
import { Loader2, LogOut, Plus } from "lucide-react";
import { toast } from "react-toastify";

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (error) {
      console.error("Failed to fetch projects", error);
      toast.error("Failed to load projects.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-12 border-b border-gray-800 pb-6">
          <h1 className="text-3xl font-bold tracking-tight">Your Projects</h1>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            <LogOut size={18} />
            Logout
          </button>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link
                key={project.project_id}
                href={`/projects/${project.project_id}/creative-hub/script`}
                className="group block p-6 bg-gray-900 rounded-xl border border-gray-800 hover:border-indigo-500/50 hover:bg-gray-800/50 transition-all duration-300"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                    <span className="text-xl font-bold text-indigo-500">
                      {project.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2 group-hover:text-indigo-400 transition-colors">
                  {project.name}
                </h3>
                <p className="text-gray-400 text-sm line-clamp-2">
                  {project.description || "No description provided."}
                </p>
              </Link>
            ))}
            
             {/* Placeholder for creating new project if needed */}
             <div className="flex flex-col items-center justify-center p-6 bg-gray-900/50 rounded-xl border border-gray-800 border-dashed hover:border-gray-700 hover:bg-gray-900 transition-all cursor-not-allowed opacity-60">
                <Plus className="h-10 w-10 text-gray-600 mb-2" />
                <p className="text-gray-500 font-medium">Create Project</p>
                <p className="text-xs text-gray-600">(Coming Soon)</p>
             </div>
          </div>
        )}
        
        {!loading && projects.length === 0 && (
            <div className="text-center py-20">
                <p className="text-gray-500 text-lg">No projects found.</p>
            </div>
        )}
      </div>
    </div>
  );
}
