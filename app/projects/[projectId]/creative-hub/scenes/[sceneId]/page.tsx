"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getScene,
  getShots,
  generateShots,
  getSceneCharacters,
  getSceneDialogs,
  updateScene,
  getSceneStoryboardData,
} from "@/services/creative-hub";
import { Scene, Shot } from "@/types/creative-hub";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Film,
  MessageSquare,
  Users,
  Edit,
  Save,
  X,
  Wand2,
  Loader2,
  Hash,
} from "lucide-react";
import { toast } from "react-toastify";
import { extractApiError } from "@/lib/extract-api-error";

export default function SceneDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const sceneId = Number(params.sceneId);

  const [scene, setScene] = useState<Scene | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [characters, setCharacters] = useState<any[]>([]);
  const [dialogs, setDialogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingShots, setLoadingShots] = useState(false);
  const [generatingShots, setGeneratingShots] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Scene>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (sceneId) fetchAll();
  }, [sceneId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sceneData, shotsData, charsData, dialogsData, storyboardData] = await Promise.all([
        getScene(sceneId),
        getShots(sceneId).catch(() => []),
        getSceneCharacters(sceneId).catch(() => []),
        getSceneDialogs(sceneId).catch(() => []),
        getSceneStoryboardData(sceneId).catch(() => null),
      ]);
      setScene(sceneData);
      setFormData(sceneData);

      // Merge previz image_url from storyboard data into shots
      const shotsWithImages = (shotsData || []).map((shot: Shot) => {
        if (shot.image_url) return shot;
        const sd = storyboardData?.shots?.find((s: any) => s.id === shot.id);
        if (!sd?.previz?.length) return shot;
        const activePreviz = sd.active_previz
          ? sd.previz.find((p: any) => p.id === sd.active_previz) ?? sd.previz[sd.previz.length - 1]
          : sd.previz[sd.previz.length - 1];
        return { ...shot, image_url: activePreviz?.image_url ?? null };
      });
      setShots(shotsWithImages);
      setCharacters(charsData || []);
      setDialogs(dialogsData || []);
    } catch (error) {
      console.error("Failed to load scene", error);
      toast.error("Failed to load scene data.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateShots = async () => {
    if (!scene) return;
    setGeneratingShots(true);
    try {
      await generateShots(scene.id);
      setTimeout(async () => {
        const data = await getShots(scene.id);
        setShots(data || []);
        setGeneratingShots(false);
      }, 3000);
    } catch (error) {
      toast.error(extractApiError(error, "Failed to generate shots."));
      setGeneratingShots(false);
    }
  };

  const handleSave = async () => {
    if (!scene) return;
    setSaving(true);
    try {
      const updated = await updateScene(scene.id, formData);
      setScene(updated);
      setFormData(updated);
      setIsEditing(false);
      toast.success("Scene updated successfully.");
    } catch (error) {
      toast.error(extractApiError(error, "Failed to update scene."));
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!scene) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--background)] gap-4">
        <p className="text-[var(--text-secondary)]">Scene not found.</p>
        <Link
          href={`/projects/${projectId}/creative-hub/scenes`}
          className="text-emerald-400 hover:text-emerald-300 flex items-center gap-2 text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Scenes
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-[var(--surface)]/90 backdrop-blur border-b border-[var(--border)] px-6 py-3 flex items-center justify-between">
        <Link
          href={`/projects/${projectId}/creative-hub/scenes`}
          className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Scenes
        </Link>
        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <button
                onClick={() => { setIsEditing(false); setFormData(scene); }}
                className="px-3 py-1.5 bg-[var(--surface-hover)] hover:bg-[var(--border)] text-[var(--text-primary)] rounded-md text-sm transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1.5 bg-[var(--surface-hover)] hover:bg-[var(--border)] text-[var(--text-primary)] rounded-md text-sm flex items-center gap-2 transition-colors"
            >
              <Edit className="h-4 w-4" /> Edit
            </button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">
        {/* Scene Header */}
        <section>
          <div className="flex items-center gap-3 mb-3">
            <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-md text-sm font-medium border border-emerald-500/20">
              Scene {scene.order}
            </span>
            {scene.set_number && (
              <span className="text-xs text-[var(--text-muted)] bg-[var(--surface-hover)] px-2 py-1 rounded border border-[var(--border)]">
                Set {scene.set_number}
              </span>
            )}
          </div>

          {isEditing ? (
            <input
              type="text"
              name="scene_name"
              value={formData.scene_name || ""}
              onChange={handleInputChange}
              className="text-3xl font-bold bg-[var(--surface-hover)] border border-[var(--border)] rounded-md px-4 py-2 text-[var(--text-primary)] w-full focus:outline-none focus:border-emerald-500 mb-4"
            />
          ) : (
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">{scene.scene_name}</h1>
          )}

          <div className="flex flex-wrap gap-5 text-[var(--text-secondary)] text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              {isEditing ? (
                <div className="flex gap-2">
                  <select
                    name="int_ext"
                    value={formData.int_ext || "INT"}
                    onChange={handleInputChange}
                    className="bg-[var(--surface-hover)] border border-[var(--border)] rounded px-2 py-1 text-[var(--text-primary)] text-xs focus:outline-none"
                  >
                    <option value="INT">INT</option>
                    <option value="EXT">EXT</option>
                    <option value="INT/EXT">INT/EXT</option>
                  </select>
                  <input
                    type="text"
                    name="location"
                    value={formData.location || ""}
                    onChange={handleInputChange}
                    placeholder="Location"
                    className="bg-[var(--surface-hover)] border border-[var(--border)] rounded px-2 py-1 text-[var(--text-primary)] text-xs focus:outline-none w-40"
                  />
                </div>
              ) : (
                <span>{scene.int_ext} {scene.location}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              {isEditing ? (
                <input
                  type="text"
                  name="environment"
                  value={formData.environment || ""}
                  onChange={handleInputChange}
                  placeholder="Time of day"
                  className="bg-[var(--surface-hover)] border border-[var(--border)] rounded px-2 py-1 text-[var(--text-primary)] text-xs focus:outline-none w-28"
                />
              ) : (
                <span>{scene.environment || "—"}</span>
              )}
            </div>
            {scene.scene_hash && (
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <Hash className="h-4 w-4" />
                <span className="font-mono text-xs">{scene.scene_hash.slice(0, 12)}…</span>
              </div>
            )}
          </div>
        </section>

        {/* Location Image */}
        {scene.location_detail?.image_url && (
          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-400" /> Location
            </h2>
            <div className="relative rounded-md overflow-hidden border border-[var(--border)] bg-[var(--background)]">
              <img
                src={scene.location_detail.image_url}
                alt={scene.location_detail.name}
                className="w-full max-h-64 object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <p className="text-white font-semibold">{scene.location_detail.name}</p>
                {scene.location_detail.description && (
                  <p className="text-[var(--text-secondary)] text-sm mt-0.5">{scene.location_detail.description}</p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Description */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Description</h2>
          {isEditing ? (
            <textarea
              name="description"
              value={formData.description || ""}
              onChange={handleInputChange}
              rows={6}
              className="w-full bg-[var(--surface-hover)]/30 border border-[var(--border)] rounded-md p-4 text-[var(--text-secondary)] leading-relaxed focus:outline-none focus:border-emerald-500"
            />
          ) : (
            <p className="text-[var(--text-secondary)] leading-relaxed bg-[var(--surface-hover)]/30 p-4 rounded-md border border-[var(--border)]">
              {scene.description || <span className="italic text-[var(--text-muted)]">No description.</span>}
            </p>
          )}
        </section>

        {/* Characters */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-400" />
            Characters ({characters.length})
          </h2>
          {characters.length > 0 ? (
            <div className="flex flex-wrap gap-4">
              {characters.map((char: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 bg-[var(--surface-hover)]/50 p-3 rounded-md border border-[var(--border)] min-w-[200px]"
                >
                  <div className="w-12 h-12 bg-[var(--surface-raised)] rounded-md overflow-hidden flex-shrink-0">
                    {char.image_url ? (
                      <img src={char.image_url} alt={char.character_name} className="w-full h-full object-contain" />
                    ) : char.character?.image_url ? (
                      <img src={char.character.image_url} alt={char.character_name} className="w-full h-full object-contain opacity-80" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[var(--surface-raised)] text-[var(--text-secondary)] text-lg font-bold">
                        {(char.character_name || char.name || "?")[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {char.character_name || char.name || (char.character ? char.character.name : "Unknown")}
                    </p>
                    {char.role && <p className="text-xs text-[var(--text-muted)]">{char.role}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[var(--text-muted)] italic">No characters linked to this scene.</p>
          )}
        </section>

        {/* Dialogs */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-emerald-400" />
            Dialogs ({dialogs.length})
          </h2>
          {dialogs.length > 0 ? (
            <div className="space-y-3">
              {dialogs.map((dialog: any, idx: number) => (
                <div key={idx} className="bg-[var(--surface-hover)]/30 border border-[var(--border)] rounded-md p-4">
                  <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
                    {(typeof dialog.character === "object" ? dialog.character?.name : dialog.character) || dialog.character_name || "Unknown"}
                  </p>
                  <p className="text-[var(--text-secondary)] leading-relaxed">{dialog.dialog || dialog.text || dialog.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[var(--text-muted)] italic">No dialogs in this scene.</p>
          )}
        </section>

        {/* Shots */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Film className="h-5 w-5 text-emerald-400" />
              Shots ({shots.length})
            </h2>
            <button
              onClick={handleGenerateShots}
              disabled={generatingShots || loadingShots}
              className="text-sm px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {generatingShots ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Wand2 className="h-3 w-3" />
              )}
              Generate Shots
            </button>
          </div>

          {generatingShots ? (
            <div className="flex items-center gap-2 text-emerald-400 text-sm py-8 justify-center border border-dashed border-emerald-500/20 rounded-md">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating shots…
            </div>
          ) : shots.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shots.map((shot) => (
                <div
                  key={shot.id}
                  className="bg-[var(--surface-hover)]/50 rounded-md border border-[var(--border)] overflow-hidden"
                >
                  {shot.image_url ? (
                    <img
                      src={shot.image_url}
                      alt={`Shot ${shot.order}`}
                      className="w-full h-40 object-cover"
                    />
                  ) : (
                    <div className="w-full h-40 bg-[var(--surface)] flex items-center justify-center">
                      <Film className="h-8 w-8 text-[var(--text-muted)]" />
                    </div>
                  )}
                  <div className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-mono text-[var(--text-muted)]">Shot {shot.order}</span>
                      <span className="text-xs px-2 py-0.5 bg-[var(--surface-raised)] rounded text-[var(--text-secondary)]">{shot.type}</span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-3">{shot.description}</p>
                    {shot.camera_angle && (
                      <p className="text-xs text-[var(--text-muted)] mt-1">Angle: {shot.camera_angle}</p>
                    )}
                    {shot.movement && (
                      <p className="text-xs text-[var(--text-muted)]">Movement: {shot.movement}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-[var(--border)] rounded-md bg-[var(--surface-hover)]/20">
              <Film className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-[var(--text-muted)]">No shots generated yet.</p>
              <p className="text-[var(--text-muted)] text-sm mt-1">Click "Generate Shots" to create AI-powered shot breakdown.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
