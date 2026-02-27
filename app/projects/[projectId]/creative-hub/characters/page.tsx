"use client";

import { useState, useEffect } from "react";
import { getScripts, getCharacters, getScriptTasks } from "@/services/creative-hub";
import { Script, Character } from "@/types/creative-hub";
import { Loader2, AlertCircle, Plus, Edit, Trash2, Wand2 } from "lucide-react";
import { useParams } from "next/navigation";
import CharacterModal from "@/components/creative-hub/CharacterModal";
import { toast } from "react-toastify";
import { extractApiError } from "@/lib/extract-api-error";

export default function CharactersPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [script, setScript] = useState<Script | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [globalTask, setGlobalTask] = useState<any>(null);

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
        setCharacters(charData || []);
      }
    } catch (error) { console.error("Failed to fetch characters", error); }
    finally { setLoading(false); }
  };

  const handleEdit = (char: Character) => { setSelectedCharacter(char); setIsModalOpen(true); };
  const handleAdd = () => { setSelectedCharacter(null); setIsModalOpen(true); };

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
      <header className="flex justify-between items-center mb-6">
        <div>
           <h1 className="text-xl font-bold mb-1 text-white">Characters</h1>
           <p className="text-[#555] text-xs">Manage cast and character details</p>
        </div>
        <button onClick={handleAdd} disabled={!script}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-30">
            <Plus className="h-4 w-4" />
            Add Character
        </button>
      </header>

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
          {characters.map((char) => (
            <div key={char.id} className="bg-[#0d0d0d] rounded-md border border-[#1a1a1a] overflow-hidden group hover:border-emerald-500/30 transition-all flex flex-col">
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
                       <button onClick={() => handleEdit(char)} className="p-2 bg-white/10 hover:bg-white/20 rounded-md text-white transition-colors" title="Edit">
                           <Edit className="h-3.5 w-3.5" />
                       </button>
                       <button onClick={() => handleDelete(char.id)} className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-md text-red-400 transition-colors" title="Delete">
                           <Trash2 className="h-3.5 w-3.5" />
                       </button>
                   </div>
               </div>
               <div className="p-3 flex-1 flex flex-col">
                   <h3 className="font-bold text-sm mb-0.5 text-white">{char.name}</h3>
                   <p className="text-[10px] text-[#555] line-clamp-2 mb-3 flex-1">{char.description || "No description."}</p>
                   <button onClick={() => handleEdit(char)}
                        className="w-full py-1.5 text-[10px] font-medium bg-[#111] hover:bg-[#161616] text-[#888] rounded-md transition-colors border border-[#1a1a1a]">
                       View Details
                   </button>
               </div>
            </div>
          ))}
        </div>
      )}

      {script && (
          <CharacterModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            character={selectedCharacter}
            scriptId={script.id}
            onUpdate={fetchData}
          />
      )}
    </div>
  );
}
