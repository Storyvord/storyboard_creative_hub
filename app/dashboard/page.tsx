"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProjects } from "@/services/project";
import { Project } from "@/types/project";
import { logout } from "@/services/auth";
import { Loader2, LogOut, Moon, Plus, Sun, Video } from "lucide-react";
import { toast } from "react-toastify";
import { useTheme } from "@/context/ThemeContext";
import CreateProjectModal from "@/components/project/CreateProjectModal";
import StatusBadge from "@/components/project/StatusBadge";

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
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
    <div className="min-h-screen p-8" style={{ background: "var(--surface)", color: "var(--text-primary)" }}>
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-10 border-b pb-5" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <Video className="h-5 w-5 text-emerald-500" />
            <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Your Projects</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              className="flex items-center justify-center p-2 rounded-md border transition-colors"
              style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 rounded-md border transition-colors text-xs font-medium"
              style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin h-6 w-6" style={{ color: "var(--text-muted)" }} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Link
                key={project.project_id}
                href={`/projects/${project.project_id}/overview`}
                className="group block p-5 rounded-md border transition-all hover:border-emerald-500/30"
                style={{ background: "var(--surface-raised)", borderColor: "var(--border)" }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="h-9 w-9 rounded-md bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                    <span className="text-lg font-bold text-emerald-500">
                      {project.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {project.status && <StatusBadge status={project.status} />}
                </div>
                <h3 className="text-base font-semibold mb-1 group-hover:text-emerald-400 transition-colors" style={{ color: "var(--text-primary)" }}>
                  {project.name}
                </h3>
                <p className="text-xs line-clamp-2" style={{ color: "var(--text-muted)" }}>
                  {project.brief || project.description || "No description provided."}
                </p>
              </Link>
            ))}

            {/* New Project button */}
            <button
              onClick={() => setCreateOpen(true)}
              className="flex flex-col items-center justify-center p-5 rounded-md border border-dashed transition-all hover:border-emerald-500/50 hover:bg-emerald-500/5 cursor-pointer"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <Plus className="h-8 w-8 mb-2 text-emerald-500" />
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>New Project</p>
            </button>
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div className="text-center py-20">
            <p style={{ color: "var(--text-muted)" }}>No projects yet. Create your first one!</p>
          </div>
        )}
      </div>

      {createOpen && (
        <CreateProjectModal
          onClose={() => setCreateOpen(false)}
          onCreated={fetchProjects}
        />
      )}
    </div>
  );
}
