"use client";

import { useState, useEffect } from "react";
import { getScripts, getScenes, generateScenes } from "@/services/creative-hub";
import { Script, Scene } from "@/types/creative-hub";
import SceneDetailModal from "@/components/creative-hub/SceneDetailModal";
import { Loader2, Plus, AlertCircle, MapPin, ChevronRight, Wand2 } from "lucide-react";
import { toast } from "react-toastify";
import { extractApiError } from "@/lib/extract-api-error";
import { useParams } from "next/navigation";

export default function ScenesPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [script, setScript] = useState<Script | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);

  useEffect(() => { if (projectId) fetchData(); }, [projectId]);

  const fetchData = async () => {
    try {
      if (!script) {
          const scripts = await getScripts(projectId);
          if (scripts && scripts.length > 0) {
            setScript(scripts[0]);
            const scenesData = await getScenes(scripts[0].id);
            setScenes(scenesData || []);
          }
      } else {
         const scenesData = await getScenes(script.id);
         setScenes(scenesData || []);
      }
    } catch (error) { console.error("Failed to fetch scenes", error); }
    finally { setLoading(false); }
  };

  const handleGenerateScenes = async () => {
    if (!script) return;
    setGenerating(true);
    try {
      await generateScenes(script.id);
      toast.success("Scene generation started.");
      setTimeout(fetchData, 5000); 
    } catch (error: any) { console.error(error); toast.error(extractApiError(error, "Failed to generate scenes.")); }
    finally { setGenerating(false); }
  };

  if (loading) return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin h-6 w-6 text-[#333]" /></div>;

  if (!script) return (
    <div className="p-6 text-center bg-[#0d0d0d] rounded-md border border-[#1a1a1a] m-6">
        <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
        <h2 className="text-base font-bold mb-1 text-white">No Script Found</h2>
        <p className="text-[#555] text-xs">Please upload a script first.</p>
    </div>
  );

  return (
    <div className="p-6">
      <header className="flex justify-between items-center mb-6">
        <div>
           <h1 className="text-xl font-bold mb-1 text-white">Scenes</h1>
           <p className="text-[#555] text-xs">Manage and visualize your script's scenes</p>
        </div>
        
        {scenes.length === 0 ? (
             <button onClick={handleGenerateScenes} disabled={generating}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-sm font-medium transition-all flex items-center gap-2">
                {generating ? <Loader2 className="animate-spin h-4 w-4" /> : <Plus className="h-4 w-4" />}
                Generate Scenes
             </button>
        ) : (
            <div className="flex items-center gap-3">
                 <span className="text-xs text-[#555]">{scenes.length} Scenes</span>
                 <button onClick={handleGenerateScenes} disabled={generating}
                     className="px-3 py-2 bg-[#161616] hover:bg-[#1a1a1a] text-white rounded-md text-xs font-medium transition-all flex items-center gap-1.5 border border-[#222]">
                     {generating ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : <Wand2 className="h-3.5 w-3.5 text-emerald-400" />}
                     Regenerate
                 </button>
            </div>
        )}
      </header>

      {scenes.length > 0 ? (
        <div className="space-y-3">
          {scenes.map((scene) => (
            <div key={scene.id} onClick={() => setSelectedScene(scene)}
                className="bg-[#0d0d0d] border border-[#1a1a1a] p-4 rounded-md hover:border-emerald-500/30 hover:bg-[#111] transition-all cursor-pointer group">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-14 h-14 bg-[#111] rounded-md flex flex-col items-center justify-center border border-[#1a1a1a] group-hover:border-emerald-500/20 transition-colors">
                        <span className="text-[9px] text-[#555] uppercase font-bold tracking-wider">SC</span>
                        <span className="text-lg font-bold text-white">{scene.order}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                            <h3 className="text-sm font-bold text-white truncate pr-4">{scene.scene_name}</h3>
                            <div className="flex items-center gap-2 text-[10px] text-[#555] bg-[#111] px-2 py-0.5 rounded border border-[#1a1a1a]">
                                <span className="uppercase font-medium">{scene.int_ext}</span>
                                <span className="text-[#333]">·</span>
                                <span>{scene.time}</span>
                            </div>
                        </div>
                        <p className="text-[#666] text-xs line-clamp-2">{scene.description}</p>
                        
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-[#555]">
                             <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate max-w-[120px]">{scene.location}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center self-center pl-3 border-l border-[#1a1a1a]">
                        <ChevronRight className="h-4 w-4 text-[#444] group-hover:text-emerald-400 transition-colors" />
                    </div>
                </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-[#0d0d0d] rounded-md border border-dashed border-[#1a1a1a]">
           <p className="text-[#555] text-xs">No scenes generated yet.</p>
           {!generating && <p className="text-[10px] text-[#444] mt-1">Click "Generate Scenes" to analyze your script.</p>}
        </div>
      )}

      {selectedScene && (
        <SceneDetailModal scene={selectedScene} onClose={() => setSelectedScene(null)} onUpdate={fetchData} />
      )}
    </div>
  );
}
