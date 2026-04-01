"use client";

import { useState, useEffect } from "react";
import { getScripts } from "@/services/creative-hub";
import { getLocations, createLocation, updateLocation, deleteLocation, generateLocationImage, getScriptTasks } from "@/services/creative-hub";
import { Script } from "@/types/creative-hub";
import { Location } from "@/types/creative-hub";
import { Loader2, Plus, Edit, Trash2, Wand2, MapPin, Upload, X } from "lucide-react";
import { useParams } from "next/navigation";
import { toast } from "react-toastify";
import { extractApiError } from "@/lib/extract-api-error";
import ModelSelector from "@/components/creative-hub/ModelSelector";
import { useGenerationTasks } from "@/hooks/useGenerationTasks";

export default function LocationsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [script, setScript] = useState<Script | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  // DB-backed: locId → true while generating
  const [generatingLocIds, setGeneratingLocIds] = useState<Record<number, boolean>>({});
  // DB-backed: taskId → locId
  const [trackedTasks, setTrackedTasks] = useState<Record<string, number>>({});
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [pendingGenerateLoc, setPendingGenerateLoc] = useState<Location | null>(null);

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

  const handleEdit = (loc: Location) => { setSelectedLocation(loc); setIsModalOpen(true); };
  const handleAdd = () => { setSelectedLocation(null); setIsModalOpen(true); };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this location?")) return;
    try {
      await deleteLocation(id);
      toast.success("Location deleted");
      fetchData();
    } catch (error) { toast.error(extractApiError(error, "Failed to delete location.")); }
  };

  const handleGenerateImage = (loc: Location) => {
    setPendingGenerateLoc(loc);
    setIsModelSelectorOpen(true);
  };

  const handleModelConfirm = async (model: string, provider: string) => {
    if (!pendingGenerateLoc) return;
    setIsModelSelectorOpen(false);
    const locId = pendingGenerateLoc.id;
    setGeneratingLocIds(prev => ({ ...prev, [locId]: true }));
    setPendingGenerateLoc(null);
    try {
      const result = await generateLocationImage(locId, model, provider);
      setTrackedTasks(prev => ({ ...prev, [result.task_id]: locId }));
      toast.success("Location image rendering — will update when ready…");
    } catch (error) {
      toast.error(extractApiError(error, "Failed to generate image."));
      setGeneratingLocIds(prev => { const n = { ...prev }; delete n[locId]; return n; });
    }
  };

  // ── DB-backed task polling ────────────────────────────────────────────────
  useGenerationTasks({
    taskIds: Object.keys(trackedTasks),
    getObjectId: (taskId) => trackedTasks[taskId] ?? 0,
    onComplete: (taskId, objectId) => {
      setTrackedTasks(prev => { const n = { ...prev }; delete n[taskId]; return n; });
      setGeneratingLocIds(prev => { const n = { ...prev }; delete n[objectId]; return n; });
      fetchData();
      toast.success("Location image is ready!");
    },
    onError: (taskId, objectId, error) => {
      setTrackedTasks(prev => { const n = { ...prev }; delete n[taskId]; return n; });
      setGeneratingLocIds(prev => { const n = { ...prev }; delete n[objectId]; return n; });
      toast.error(`Location image failed: ${error}`);
    },
  });



  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="animate-spin h-6 w-6 text-[#333]" /></div>;

  return (
    <div className="p-6">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold mb-1 text-white">Locations</h1>
          <p className="text-[#555] text-xs">Manage filming locations and environments</p>
        </div>
        <button onClick={handleAdd} disabled={!script}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-30">
          <Plus className="h-4 w-4" />
          Add Location
        </button>
      </header>

      {locations.length === 0 ? (
        <div className="text-center py-16 bg-[#0d0d0d] rounded-md border border-dashed border-[#1a1a1a]">
          <MapPin className="h-8 w-8 text-[#333] mx-auto mb-3" />
          <p className="text-[#555] text-xs">No locations found. Add manually or generate scenes first.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {locations.map((loc, idx) => (
            <div key={loc.id} {...(idx === 0 ? { "data-tour": "location-card" } : {})} className="bg-[#0d0d0d] rounded-md border border-[#1a1a1a] overflow-hidden group hover:border-emerald-500/30 transition-all flex flex-col">
              <div className="aspect-video bg-[#0a0a0a] relative group-hover:opacity-90 transition-opacity">
                {loc.image_url ? (
                  <img src={loc.image_url} alt={loc.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[#333]">
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
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button onClick={() => handleEdit(loc)} className="p-2 bg-white/10 hover:bg-white/20 rounded-md text-white transition-colors" title="Edit">
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleGenerateImage(loc)}
                    disabled={!!generatingLocIds[loc.id]}
                    className="p-2 bg-emerald-500/20 hover:bg-emerald-500/40 rounded-md text-emerald-400 transition-colors" title="Generate AI Image"
                  >
                    {generatingLocIds[loc.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => handleDelete(loc.id)} className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-md text-red-400 transition-colors" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="p-3 flex-1 flex flex-col">
                <h3 className="font-bold text-sm mb-0.5 text-white">{loc.name}</h3>
                {loc.time && <p className="text-[10px] text-emerald-400/70 mb-1">{loc.time}</p>}
                <p className="text-[10px] text-[#555] line-clamp-2 mb-3 flex-1">{loc.description || "No description."}</p>
                <button onClick={() => handleEdit(loc)}
                  className="w-full py-1.5 text-[10px] font-medium bg-[#111] hover:bg-[#161616] text-[#888] rounded-md transition-colors border border-[#1a1a1a]">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && script && (
        <LocationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          location={selectedLocation}
          scriptId={script.id}
          onUpdate={fetchData}
          onGenerate={(locId) => {
              setPendingGenerateLoc({ id: locId } as Location);
              setIsModelSelectorOpen(true);
          }}
        />
      )}

      {/* Model selector for AI image generation — placed outside LocationModal to avoid z-index conflicts */}
      <ModelSelector
        isOpen={isModelSelectorOpen}
        onClose={() => { setIsModelSelectorOpen(false); setPendingGenerateLoc(null); }}
        onConfirm={handleModelConfirm}
        itemCount={1}
        title="Select Model for Location Image"
        confirmLabel="Generate Image"
      />
    </div>
  );
}

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: Location | null;
  scriptId: number;
  onUpdate: () => void;
  onGenerate?: (locId: number) => void;
}

function LocationModal({ isOpen, onClose, location, scriptId, onUpdate, onGenerate }: LocationModalProps) {
  const [form, setForm] = useState({ name: "", description: "", time: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (location) {
      setForm({ name: location.name || "", description: location.description || "", time: location.time || "" });
      setImagePreview(location.image_url || null);
    } else {
      setForm({ name: "", description: "", time: "" });
      setImagePreview(null);
    }
    setImageFile(null);
  }, [location, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      if (location) {
        await updateLocation(location.id, { ...form, ...(imageFile ? { image_url: imageFile } : {}) });
        toast.success("Location updated");
      } else {
        await createLocation(scriptId, { ...form, ...(imageFile ? { image_url: imageFile } : {}) });
        toast.success("Location created");
      }
      onUpdate();
      onClose();
    } catch (error) { toast.error(extractApiError(error, "Failed to save location.")); }
    finally { setSaving(false); }
  };

  const handleSaveAndGenerate = async () => {
    if (!form.name.trim()) { toast.error("Name is required before generating."); return; }
    setSaving(true);
    try {
      let locId = location?.id;
      if (locId) {
        await updateLocation(locId, { ...form, ...(imageFile ? { image_url: imageFile } : {}) });
      } else {
        const newLoc = await createLocation(scriptId, { ...form, ...(imageFile ? { image_url: imageFile } : {}) });
        locId = newLoc.id;
      }
      onUpdate();
      onClose();
      if (onGenerate && locId) onGenerate(locId);
    } catch (error) { toast.error(extractApiError(error, "Failed to save & generate.")); }
    finally { setSaving(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-md w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-[#1a1a1a] flex justify-between items-center">
          <h2 className="text-base font-bold text-white">{location ? "Edit Location" : "Add Location"}</h2>
          <button onClick={onClose} className="p-1 hover:bg-[#1a1a1a] rounded-md text-[#666]"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Image */}
          <div
            className="aspect-video bg-[#0a0a0a] rounded-md border border-[#1a1a1a] overflow-hidden relative cursor-pointer group"
            onClick={() => fileRef.current?.click()}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Location" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[#333]">
                <Upload className="h-6 w-6 mb-1 opacity-50" />
                <span className="text-[10px]">Click to upload image</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Upload className="h-5 w-5 text-white" />
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          <div>
            <label className="text-[10px] text-[#555] uppercase tracking-widest block mb-1">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full bg-[#111] border border-[#222] rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500/50"
              placeholder="e.g. Downtown Alley"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#555] uppercase tracking-widest block mb-1">Time of Day</label>
            <input
              type="text"
              value={form.time}
              onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
              className="w-full bg-[#111] border border-[#222] rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500/50"
              placeholder="e.g. Night, Golden Hour"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#555] uppercase tracking-widest block mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={3}
              className="w-full bg-[#111] border border-[#222] rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500/50 resize-none"
              placeholder="Describe the location..."
            />
          </div>

          <div className="bg-[#111] p-3 rounded-md border border-[#1a1a1a] flex items-center justify-between mt-4">
              <div>
                  <span className="text-xs text-[#999] font-medium block">AI Location Generation</span>
                  <span className="text-[10px] text-[#555]">Instantly saves details and generates an image</span>
              </div>
              <button
                  type="button"
                  onClick={handleSaveAndGenerate}
                  disabled={saving}
                  className="px-3 py-1.5 text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-md transition-colors flex items-center gap-1.5 font-medium"
              >
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                  Save & Generate
              </button>
          </div>
        </div>
        <div className="p-4 border-t border-[#1a1a1a] flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#222] text-white rounded-md text-sm transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-sm transition-colors flex items-center gap-2 disabled:opacity-50">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {location ? "Save Changes" : "Create Location"}
          </button>
        </div>
      </div>
    </div>
  );
}
