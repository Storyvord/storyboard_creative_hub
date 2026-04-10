"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProjects } from "@/services/project";
import { Project } from "@/types/project";
import { logout } from "@/services/auth";
import { Loader2, LogOut, Moon, Plus, Sun, Video } from "lucide-react";
import { toast } from "react-toastify";
import { useTheme } from "@/context/ThemeContext";

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme, toggleTheme } = useTheme();

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
    <div className="min-h-screen bg-[var(--surface)] text-[var(--text-primary)] p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-10 border-b border-[var(--border)] pb-5">
          <div className="flex items-center gap-3">
            <Video className="h-5 w-5 text-emerald-500" />
            <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Your Projects</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              className="flex items-center justify-center p-2 rounded-md bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] transition-colors border border-[var(--border)] text-[var(--text-secondary)]"
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] transition-colors text-xs font-medium text-[var(--text-secondary)] border border-[var(--border)]"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin h-6 w-6 text-[var(--text-muted)]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Link
                key={project.project_id}
                href={`/projects/${project.project_id}/creative-hub/script`}
                className="group block p-5 bg-[var(--surface-raised)] rounded-md border border-[var(--border)] hover:border-emerald-500/30 hover:bg-[var(--surface-hover)] transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="h-9 w-9 rounded-md bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                    <span className="text-lg font-bold text-emerald-500">
                      {project.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <h3 className="text-base font-semibold mb-1 text-[var(--text-primary)] group-hover:text-emerald-400 transition-colors">
                  {project.name}
                </h3>
                <p className="text-[var(--text-muted)] text-xs line-clamp-2">
                  {project.description || "No description provided."}
                </p>
              </Link>
            ))}

            <div className="flex flex-col items-center justify-center p-5 bg-[var(--surface)] rounded-md border border-dashed border-[var(--border)] hover:border-[var(--border-hover)] transition-all cursor-not-allowed opacity-40">
              <Plus className="h-8 w-8 text-[var(--text-muted)] mb-2" />
              <p className="text-[var(--text-muted)] text-sm font-medium">New Project</p>
              <p className="text-[10px] text-[var(--text-muted)]">(Coming Soon)</p>
            </div>
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div className="text-center py-20">
            <p className="text-[var(--text-muted)]">No projects found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
