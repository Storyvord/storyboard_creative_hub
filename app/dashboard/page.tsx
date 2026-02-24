"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProjects } from "@/services/project";
import { Project } from "@/types/project";
import { logout } from "@/services/auth";
import { Loader2, LogOut, Plus, Video } from "lucide-react";
import { toast } from "react-toastify";

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchProjects(); }, []);

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
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-10 border-b border-[#1a1a1a] pb-5">
          <div className="flex items-center gap-3">
            <Video className="h-5 w-5 text-emerald-500" />
            <h1 className="text-xl font-bold tracking-tight text-white">Your Projects</h1>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#161616] hover:bg-[#1a1a1a] transition-colors text-xs font-medium text-[#888] border border-[#222]"
          >
            <LogOut size={14} />
            Logout
          </button>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin h-6 w-6 text-[#333]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Link
                key={project.project_id}
                href={`/projects/${project.project_id}/creative-hub/script`}
                className="group block p-5 bg-[#0d0d0d] rounded-md border border-[#1a1a1a] hover:border-emerald-500/30 hover:bg-[#111] transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="h-9 w-9 rounded-md bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                    <span className="text-lg font-bold text-emerald-500">
                      {project.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <h3 className="text-base font-semibold mb-1 text-white group-hover:text-emerald-400 transition-colors">
                  {project.name}
                </h3>
                <p className="text-[#666] text-xs line-clamp-2">
                  {project.description || "No description provided."}
                </p>
              </Link>
            ))}
            
            <div className="flex flex-col items-center justify-center p-5 bg-[#0a0a0a] rounded-md border border-dashed border-[#1a1a1a] hover:border-[#333] transition-all cursor-not-allowed opacity-40">
                <Plus className="h-8 w-8 text-[#444] mb-2" />
                <p className="text-[#555] text-sm font-medium">New Project</p>
                <p className="text-[10px] text-[#444]">(Coming Soon)</p>
            </div>
          </div>
        )}
        
        {!loading && projects.length === 0 && (
            <div className="text-center py-20">
                <p className="text-[#555]">No projects found.</p>
            </div>
        )}
      </div>
    </div>
  );
}
