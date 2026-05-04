"use client";

import { useState, useEffect, useRef } from "react";
import { getScripts } from "@/services/creative-hub";
import { getLocations, createLocation, getScriptTasks } from "@/services/creative-hub";
import { Script } from "@/types/creative-hub";
import { Location } from "@/types/creative-hub";
import { Loader2, Plus, MapPin, Upload, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { extractApiError } from "@/lib/extract-api-error";
import { useGenerationTasks } from "@/hooks/useGenerationTasks";

export default function LocationsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [script, setScript] = useState<Script | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // DB-backed: locId → true while generating (driven by background tasks restored from DB)
  const [generatingLocIds, setGeneratingLocIds] = useState<Record<number, boolean>>({});
  // DB-backed: taskId → locId
  const [trackedTasks, setTrackedTasks] = useState<Record<string, number>>({});

  useEffect(() => { if (projectId) fetchData(); }, [projectId]);

  const fetchData = async () => {
    try {
      const scripts = await getScripts(projectId);
      if (scripts && scripts.length > 0) {
        const currentScript = scripts[0];
        setScript(currentScript);
        const locData = await getLocations(currentScript.id);

        // Order by frequency as shown in the Analysis (Setting Distribution)
        const distData = currentScript.analysis?.setting_distribution || {};
        const sorted = [...(locData || [])].sort((a, b) => {
             const valA = distData[a.name.trim().toUpperCase()] || 0;
             const valB = distData[b.name.trim().toUpperCase()] || 0;
             if (valB !== valA) return valB - valA;
             return a.name.localeCompare(b.name);
        });

        setLocations(sorted);

        // ── Restore in-progress location tasks from DB ──
        try {
          const ACTIVE = new Set(['processing', 'pending', 'retrying', 'started']);
          const MAX_AGE = 60 * 60 * 1000;
          const now = Date.now();
          const tasks = await getScriptTasks(currentScript.id);
          const newTracked: Record<string, number> = {};
          const genIds: Record<number, boolean> = {};
          for (const t of (tasks.locations || [])) {
            if (ACTIVE.has(t.status) && now - new Date(t.created_at).getTime() < MAX_AGE) {
              newTracked[t.task_id] = t.object_id;
              genIds[t.object_id] = true;
            }
          }
          setTrackedTasks(newTracked);
          setGeneratingLocIds(genIds);
        } catch { /* task restore non-blocking */ }
      }
    } catch (error) { console.error("Failed to fetch locations", error); }
    finally { setLoading(false); }
  };

  const handleAdd = () => { setIsModalOpen(true); };
  const handleOpenDetail = (locId: number) => {
    router.push(`/projects/${projectId}/creative-hub/locations/${locId}`);
  };

  // ── DB-backed task polling for any in-flight generation kicked off elsewhere ──
  useGenerationTasks({
    taskIds: Object.keys(trackedTasks),
    getObjectId: (taskId) => trackedTasks[taskId] ?? 0,
    onComplete: (taskId, objectId) => {
      setTrackedTasks(prev => { const n = { ...prev }; delete n[taskId]; return n; });
      setGeneratingLocIds(prev => { const n = { ...prev }; delete n[objectId]; return n; });
      fetchData();
    },
    onError: (taskId, objectId) => {
      setTrackedTasks(prev => { const n = { ...prev }; delete n[taskId]; return n; });
      setGeneratingLocIds(prev => { const n = { ...prev }; delete n[objectId]; return n; });
    },
  });



  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="animate-spin h-6 w-6 text-[var(--text-muted)]" /></div>;

  return (
    <div className="p-6">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold mb-1 text-[var(--text-primary)]">Locations</h1>
          <p className="text-[var(--text-muted)] text-xs">Manage filming locations and environments</p>
        </div>
        <button onClick={handleAdd} disabled={!script}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-30">
          <Plus className="h-4 w-4" />
          Add Location
        </button>
      </header>

      {locations.length === 0 ? (
        <div className="text-center py-16 bg-[var(--surface)] rounded-md border border-dashed border-[var(--border)]">
          <MapPin className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-3" />
          <p className="text-[var(--text-muted)] text-xs">No locations found. Add manually or generate scenes first.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {locations.map((loc, idx) => (
            <div
              key={loc.id}
              {...(idx === 0 ? { "data-tour": "location-card" } : {})}
              onClick={() => handleOpenDetail(loc.id)}
              className="bg-[var(--surface)] rounded-md border border-[var(--border)] overflow-hidden group hover:border-emerald-500/30 transition-all flex flex-col cursor-pointer"
            >
              <div className="aspect-video bg-[var(--background)] relative">
                {loc.image_url ? (
                  <img src={loc.image_url} alt={loc.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
                    <MapPin className="h-8 w-8 mb-1 opacity-30" />
                    <span className="text-[9px] uppercase tracking-wider">No Image</span>
                  </div>
                )}
                {generatingLocIds[loc.id] && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                    <Loader2 className="h-6 w-6 text-emerald-500 animate-spin mb-1" />
                    <span className="text-[10px] text-emerald-400 font-medium">Generating...</span>
                  </div>
                )}
              </div>
              <div className="p-3 flex-1 flex flex-col">
                <h3 className="font-bold text-sm mb-0.5 text-[var(--text-primary)]">{loc.name}</h3>
                {loc.time && <p className="text-[10px] text-emerald-400/70 mb-1">{loc.time}</p>}
                <p className="text-[10px] text-[var(--text-muted)] line-clamp-2 flex-1">{loc.description || "No description."}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && script && (
        <LocationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          location={null}
          scriptId={script.id}
          onUpdate={fetchData}
        />
      )}
    </div>
  );
}

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: Location | null;
  scriptId: number;
  onUpdate: () => void;
}

function LocationModal({ isOpen, onClose, scriptId, onUpdate }: LocationModalProps) {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const [form, setForm] = useState({ name: "", description: "", time: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setForm({ name: "", description: "", time: "" });
      setImagePreview(null);
      setImageFile(null);
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const newLoc = await createLocation(scriptId, { ...form, ...(imageFile ? { image_url: imageFile } : {}) });
      toast.success("Location created");
      onUpdate();
      onClose();
      if (newLoc?.id) router.push(`/projects/${projectId}/creative-hub/locations/${newLoc.id}`);
    } catch (error) { toast.error(extractApiError(error, "Failed to create location.")); }
    finally { setSaving(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-md w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-[var(--border)] flex justify-between items-center">
          <h2 className="text-base font-bold text-[var(--text-primary)]">Add Location</h2>
          <button onClick={onClose} className="p-1 hover:bg-[var(--surface-hover)] rounded-md text-[var(--text-secondary)]"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div
            className="aspect-video bg-[var(--background)] rounded-md border border-[var(--border)] overflow-hidden relative cursor-pointer group"
            onClick={() => fileRef.current?.click()}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Location" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
                <Upload className="h-6 w-6 mb-1 opacity-50" />
                <span className="text-[10px]">Click to upload image (optional)</span>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          <div>
            <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest block mb-1">Name *</label>
            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-emerald-500/50"
              placeholder="e.g. Downtown Alley" />
          </div>
          <div>
            <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest block mb-1">Time of Day</label>
            <input type="text" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-emerald-500/50"
              placeholder="e.g. Night, Golden Hour" />
          </div>
          <div>
            <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest block mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-emerald-500/50 resize-none"
              placeholder="Describe the location..." />
          </div>
          <p className="text-[10px] text-[var(--text-muted)]">After creation you&apos;ll be taken to the location&apos;s detail page where you can generate AI images and manage history.</p>
        </div>
        <div className="p-4 border-t border-[var(--border)] flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-[var(--surface-hover)] hover:bg-[var(--border)] text-white rounded-md text-sm transition-colors">Cancel</button>
          <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-sm transition-colors flex items-center gap-2 disabled:opacity-50">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create Location
          </button>
        </div>
      </div>
    </div>
  );
}
