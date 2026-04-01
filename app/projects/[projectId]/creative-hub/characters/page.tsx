"use client";

import { useState, useEffect } from "react";
import { getScripts, getCharacters, getScriptTasks } from "@/services/creative-hub";
import { Script, Character } from "@/types/creative-hub";
import { Loader2, AlertCircle, Plus, Trash2, Wand2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import CharacterModal from "@/components/creative-hub/CharacterModal";
import { toast } from "react-toastify";
import { extractApiError } from "@/lib/extract-api-error";

export default function CharactersPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [script, setScript] = useState<Script | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [globalTask, setGlobalTask] = useState<any>(null);
  const [generatingId, setGeneratingId] = useState<number | null>(null);

  useEffect(() => { if (projectId) fetchData(); }, [projectId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (script?.id) {
        checkTasks();
        interval = setInterval(checkTasks, 5000);
    }
    return () => clearInterval(interval);
  }, [script?.id]);

  const checkTasks = async () => {
    try {
        if (!script?.id) return;
        const data = await getScriptTasks(script.id);
        const { characters } = data;
        let activeTask = null;
        if (characters && characters.length > 0) {
            const now = new Date().getTime();
            const maxAgeMs = 60 * 60 * 1000;
            const incompleteTasks = characters.filter((t: any) => {
                const taskAge = now - new Date(t.created_at || new Date()).getTime();
                return taskAge < maxAgeMs && (t.status === 'processing' || t.status === 'pending' || t.status === 'retrying');
            });
            if (incompleteTasks.length > 0) {
                activeTask = incompleteTasks[incompleteTasks.length - 1];
            } else if (globalTask && globalTask.status !== 'completed' && globalTask.status !== 'failed') {
                const justFinishedTask = characters.find((t: any) => t.task_id === globalTask.task_id);
                if (justFinishedTask && (justFinishedTask.status === 'completed' || justFinishedTask.status === 'failed')) {
                    fetchData();
                    if (justFinishedTask.status === 'failed') toast.error(justFinishedTask.error || "Character generation failed. Please try again.");
                }
            }
        }
        setGlobalTask(activeTask);
    } catch (e) { console.error("Failed to check script tasks", e); }
  };

  const fetchData = async () => {
    try {
      const scripts = await getScripts(projectId);
      if (scripts && scripts.length > 0) {
        const currentScript = scripts[0];
        setScript(currentScript);
        const charData = await getCharacters(currentScript.id);
        
        // Order by frequency as shown in the Analysis
        const appearanceData = currentScript.analysis?.character_appearances || {};
        const sorted = [...(charData || [])].sort((a, b) => {
             const countA = appearanceData[a.name.trim().toUpperCase()]?.count || 0;
             const countB = appearanceData[b.name.trim().toUpperCase()]?.count || 0;
             if (countB !== countA) return countB - countA;
             return a.name.localeCompare(b.name);
        });
        
        setCharacters(sorted);
      }
    } catch (error) { console.error("Failed to fetch characters", error); }
    finally { setLoading(false); }
  };

  const handleAdd = () => { setIsModalOpen(true); };

  const handleDelete = async (id: number) => {
      if (!confirm("Delete this character?")) return;
      try {
          const { deleteCharacter } = await import("@/services/creative-hub");
          await deleteCharacter(id);
          toast.success("Character deleted");
          fetchData();
      } catch (error) { console.error(error); toast.error(extractApiError(error, "Failed to delete character.")); }
  };

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="animate-spin h-6 w-6 text-[#333]" /></div>;

  return (
    <div className="p-6">
      <header className="flex justify-between items-center mb-4">
        <div>
           <h1 className="text-xl font-bold mb-1 text-white">Characters</h1>
           <p className="text-[#555] text-xs">Manage cast and character details</p>
        </div>
        <button data-tour="add-character-btn" onClick={handleAdd} disabled={!script}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-30">
            <Plus className="h-4 w-4" />
            Add Character
        </button>
      </header>

      {/* Characters vs Scene Characters explainer */}
      <div data-tour="characters-vs-scene-info" className="mb-6 rounded-md border border-[#1a1a1a] bg-[#0d0d0d] p-4">
        <div className="flex gap-4">
          <div className="flex-1 border-r border-[#1a1a1a] pr-4">
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Characters (this page)</p>
            <p className="text-[11px] text-[#888] leading-relaxed">The <span className="text-white font-medium">global reference portrait</span> for each cast member — their canonical face, build, and appearance. Used as the base for all AI generation.</p>
          </div>
          <div className="flex-1 pl-4">
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Scene Characters (inside each scene)</p>
            <p className="text-[11px] text-[#888] leading-relaxed">The <span className="text-white font-medium">scene-specific look</span> for the same character — different costume, injury, aging, makeup effects. Same actor, different state per scene. Set using the <span className="text-indigo-300">Fitting Room</span> inside each scene's detail view.</p>
          </div>
        </div>
      </div>

      {globalTask && (
          <div className="mb-6 p-3 bg-emerald-950/40 rounded-md border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className="bg-emerald-600/20 p-1.5 rounded-md text-emerald-400">
                      <Wand2 className="h-4 w-4 animate-pulse" />
                  </div>
                  <div>
                      <h4 className="font-semibold text-sm text-white">Generating Characters</h4>
                      <p className="text-[10px] text-emerald-300/70">{globalTask.progress_message || `Task: ${globalTask.task_id}`}</p>
                  </div>
              </div>
              <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                  <span className="text-xs font-medium text-white">{globalTask.progress_percentage}%</span>
              </div>
          </div>
      )}
      
      {characters.length === 0 ? (
        <div className="text-center py-16 bg-[#0d0d0d] rounded-md border border-dashed border-[#1a1a1a]">
            <p className="text-[#555] text-xs">No characters found. Generate scenes or add manually.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {characters.map((char, idx) => (
            <div key={char.id} {...(idx === 0 ? { "data-tour": "character-card" } : {})} className="bg-[#0d0d0d] rounded-md border border-[#1a1a1a] overflow-hidden group hover:border-emerald-500/30 transition-all flex flex-col cursor-pointer" onClick={() => router.push(`/projects/${projectId}/creative-hub/characters/${char.id}`)}>
               <div className="aspect-square bg-[#0a0a0a] relative group-hover:opacity-90 transition-opacity">
                   {char.image_url ? (
                       <img src={char.image_url} alt={char.name} className="w-full h-full object-cover" />
                   ) : (
                       <div className="w-full h-full flex flex-col items-center justify-center text-[#333]">
                           <span className="text-3xl font-bold mb-1">{char.name.charAt(0)}</span>
                           <span className="text-[9px] uppercase tracking-wider">No Image</span>
                       </div>
                   )}
                   <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                       <button onClick={(e) => { e.stopPropagation(); handleDelete(char.id); }} className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-md text-red-400 transition-colors" title="Delete">
                           <Trash2 className="h-3.5 w-3.5" />
                       </button>
                   </div>
                   {generatingId === char.id && (
                       <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                           <Loader2 className="h-6 w-6 text-emerald-500 animate-spin mb-1" />
                           <span className="text-[10px] text-emerald-400 font-medium">Generating...</span>
                       </div>
                   )}
               </div>
               <div className="p-3 flex-1 flex flex-col">
                   <h3 className="font-bold text-sm mb-0.5 text-white">{char.name}</h3>
                   <p className="text-[10px] text-[#555] line-clamp-2 mb-3 flex-1">{char.description || "No description."}</p>
                   <div className="w-full py-1.5 text-[10px] font-medium bg-[#111] text-[#888] rounded-md text-center border border-[#1a1a1a]">
                       View Details
                   </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {script && (
          <CharacterModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            character={null}
            scriptId={script.id}
            onUpdate={() => {
                fetchData().finally(() => setGeneratingId(null));
            }}
            onGenerate={(id) => setGeneratingId(id)}
          />
      )}
    </div>
  );
}
