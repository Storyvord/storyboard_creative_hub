"use client";

import { useState, useEffect } from "react";
import { getScripts, getCharacters, getScriptTasks } from "@/services/creative-hub";
import { Script, Character } from "@/types/creative-hub";
import { Loader2, AlertCircle, Plus, Edit, Trash2, Wand2 } from "lucide-react";
import { useParams } from "next/navigation";
import CharacterModal from "@/components/creative-hub/CharacterModal";
import { toast } from "react-toastify";

export default function CharactersPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  const [script, setScript] = useState<Script | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  
  const [globalTask, setGlobalTask] = useState<any>(null); // To store character_generation task

  useEffect(() => {
    if (projectId) {
        fetchData();
    }
  }, [projectId]);

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
            const maxAgeMs = 60 * 60 * 1000; // 1 hour threshold
            
            // Only care about tasks that are NOT completed/failed to avoid showing old history
            // AND are not older than maxAge
            const incompleteTasks = characters.filter((t: any) => {
                const taskAge = now - new Date(t.created_at || new Date()).getTime();
                return taskAge < maxAgeMs && (t.status === 'processing' || t.status === 'pending' || t.status === 'retrying');
            });
            
            if (incompleteTasks.length > 0) {
                activeTask = incompleteTasks[incompleteTasks.length - 1]; // Use most recent incomplete
            } else if (globalTask && globalTask.status !== 'completed' && globalTask.status !== 'failed') {
                // If we WERE tracking a task, and now there are no incomplete tasks, it just finished!
                const justFinishedTask = characters.find((t: any) => t.task_id === globalTask.task_id);
                if (justFinishedTask && (justFinishedTask.status === 'completed' || justFinishedTask.status === 'failed')) {
                    fetchData(); // Refresh list to get new images
                    if (justFinishedTask.status === 'failed') {
                         toast.error("Character generation failed: " + (justFinishedTask.error || "Unknown error"));
                    }
                }
            }
        }
        setGlobalTask(activeTask);
    } catch (e) {
        console.error("Failed to check script tasks", e);
    }
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
    } catch (error) {
      console.error("Failed to fetch characters", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (char: Character) => {
      setSelectedCharacter(char);
      setIsModalOpen(true);
  }

  const handleAdd = () => {
      setSelectedCharacter(null);
      setIsModalOpen(true);
  }

  // Import deleteCharacter first to use it
  const handleDelete = async (id: number) => {
      if (!confirm("Are you sure you want to delete this character?")) return;
      try {
          // Dynamic import or assume it's imported (need to update imports)
          const { deleteCharacter } = await import("@/services/creative-hub");
          await deleteCharacter(id);
          toast.success("Character deleted");
          fetchData();
      } catch (error) {
           console.error("Failed to delete", error);
           toast.error("Failed to delete character");
      }
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-indigo-500" /></div>;

  return (
    <div className="p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
           <h1 className="text-3xl font-bold mb-2">Characters</h1>
           <p className="text-gray-400">Manage cast and character details</p>
        </div>
        <button
            onClick={handleAdd}
            disabled={!script}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <Plus className="h-5 w-5" />
            Add Character
        </button>
      </header>

      {/* Global Generation Loader */}
      {globalTask && (
          <div className="mb-8 p-4 bg-indigo-900/40 rounded-xl border border-indigo-500/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className="bg-indigo-600/30 p-2 rounded-lg text-indigo-400">
                      <Wand2 className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                      <h4 className="font-semibold text-white">Generating Initial Characters</h4>
                      <p className="text-sm text-indigo-300">
                          {globalTask.progress_message || `Task ID: ${globalTask.task_id}`}
                      </p>
                  </div>
              </div>
              <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
                  <span className="text-sm font-medium text-white">{globalTask.progress_percentage}%</span>
              </div>
          </div>
      )}
      
      {characters.length === 0 ? (
        <div className="text-center py-20 bg-gray-900/50 rounded-xl border border-dashed border-gray-800">
            <p className="text-gray-500">No characters found. Generate scenes or add manually.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {characters.map((char) => (
            <div key={char.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden group hover:border-indigo-500/50 transition-all flex flex-col">
               <div className="aspect-square bg-gray-800 relative group-hover:opacity-90 transition-opacity">
                   {char.image_url ? (
                       <img src={char.image_url} alt={char.name} className="w-full h-full object-cover" />
                   ) : (
                       <div className="w-full h-full flex flex-col items-center justify-center text-gray-700">
                           <span className="text-4xl font-bold mb-2">{char.name.charAt(0)}</span>
                           <span className="text-xs uppercase tracking-wider">No Image</span>
                       </div>
                   )}
                   {/* Overlay Actions */}
                   <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                       <button 
                            onClick={() => handleEdit(char)}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors" 
                            title="Edit"
                       >
                           <Edit className="h-4 w-4" />
                       </button>
                       <button 
                            onClick={() => handleDelete(char.id)}
                            className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-full text-red-500 backdrop-blur-sm transition-colors" 
                            title="Delete"
                       >
                           <Trash2 className="h-4 w-4" />
                       </button>
                   </div>
               </div>
               <div className="p-4 flex-1 flex flex-col">
                   <h3 className="font-bold text-lg mb-1 text-white">{char.name}</h3>
                   <p className="text-xs text-gray-500 line-clamp-2 mb-4 flex-1">{char.description || "No description."}</p>
                   
                   <button 
                        onClick={() => handleEdit(char)}
                        className="w-full py-2 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors border border-gray-700"
                   >
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
