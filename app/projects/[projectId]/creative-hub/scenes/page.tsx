"use client";

import { useState, useEffect } from "react";
import { getScripts, getScenes, generateScenes } from "@/services/creative-hub";
import { Script, Scene } from "@/types/creative-hub";
import SceneDetailModal from "@/components/creative-hub/SceneDetailModal";
import { Loader2, Plus, AlertCircle, MapPin, Film, ChevronRight, Wand2 } from "lucide-react";
import { toast } from "react-toastify";
import { useParams } from "next/navigation";

export default function ScenesPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [script, setScript] = useState<Script | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (projectId) {
        fetchData();
    }
  }, [projectId]);

  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);

  const fetchData = async () => {
    try {
      if (!script) {
          const scripts = await getScripts(projectId);
          if (scripts && scripts.length > 0) {
            setScript(scripts[0]);
            // Logic to fetch scenes needs script ID, which we set in state 
            // but state update is async. Better to chain or rely on useEffect dependency.
            // For simplicity in this fix, we'll re-use the fetched script object directly.
            const scenesData = await getScenes(scripts[0].id);
            setScenes(scenesData || []);
          }
      } else {
         const scenesData = await getScenes(script.id);
         setScenes(scenesData || []);
      }
    } catch (error) {
      console.error("Failed to fetch scenes", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
     if (projectId) fetchData();
  }, [projectId]);


  const handleGenerateScenes = async () => {
    if (!script) return;
    setGenerating(true);
    try {
      await generateScenes(script.id);
      toast.success("Scene generation started. This may take a while.");
      setTimeout(fetchData, 5000); 
    } catch (error: any) {
      console.error("Failed to generate scenes", error);
      toast.error("Failed to generate scenes.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  if (!script) {
     return (
        <div className="p-8 text-center bg-gray-900 rounded-xl border border-gray-800 m-8">
            <AlertCircle className="h-10 w-10 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">No Script Found</h2>
            <p className="text-gray-400">Please upload a script first to generate scenes.</p>
        </div>
     )
  }

  return (
    <div className="p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
           <h1 className="text-3xl font-bold mb-2">Scenes</h1>
           <p className="text-gray-400">Manage and visualize your script's scenes</p>
        </div>
        
        {scenes.length === 0 ? (
             <button
                onClick={handleGenerateScenes}
                disabled={generating}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
             >
                {generating ? <Loader2 className="animate-spin h-5 w-5" /> : <Plus className="h-5 w-5" />}
                Generate Scenes
             </button>
        ) : (
            <div className="flex items-center gap-4">
                 <div className="text-sm text-gray-500">
                    {scenes.length} Scenes
                </div>
                <button
                    onClick={handleGenerateScenes}
                    disabled={generating}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-all flex items-center gap-2 text-sm border border-gray-700"
                >
                    {generating ? <Loader2 className="animate-spin h-4 w-4" /> : <Wand2 className="h-4 w-4 text-indigo-400" />}
                    Regenerate All
                </button>
            </div>
        )}
      </header>

      {scenes.length > 0 ? (
        <div className="space-y-4">
          {scenes.map((scene) => (
            <div 
                key={scene.id} 
                onClick={() => setSelectedScene(scene)}
                className="bg-gray-900 border border-gray-800 p-4 rounded-xl hover:border-indigo-500/50 hover:bg-gray-800/50 transition-all cursor-pointer group"
            >
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-16 h-16 bg-gray-800 rounded-lg flex flex-col items-center justify-center border border-gray-700 group-hover:border-indigo-500/30 transition-colors">
                        <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Scene</span>
                        <span className="text-xl font-bold text-white">{scene.order}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                            <h3 className="text-lg font-bold text-white truncate pr-4">{scene.scene_name}</h3>
                            <div className="flex items-center gap-3 text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded border border-gray-700">
                                <span className="uppercase font-medium">{scene.int_ext}</span>
                                <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                                <span>{scene.time}</span>
                            </div>
                        </div>
                        <p className="text-gray-400 text-sm line-clamp-2">{scene.description}</p>
                        
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                             <div className="flex items-center gap-1.5">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate max-w-[150px]">{scene.location}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center self-center pl-4 border-l border-gray-800">
                        <ChevronRight className="h-5 w-5 text-gray-600 group-hover:text-indigo-400 transition-colors" />
                    </div>
                </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-gray-900/50 rounded-xl border border-dashed border-gray-800">
           <p className="text-gray-500">No scenes generated yet.</p>
           {!generating && (
               <p className="text-sm text-gray-600 mt-2">Click "Generate Scenes" to analyze your script.</p>
           )}
        </div>
      )}

      {selectedScene && (
        <SceneDetailModal 
            scene={selectedScene} 
            onClose={() => setSelectedScene(null)} 
            onUpdate={fetchData} 
        />
      )}
    </div>
  );
}
