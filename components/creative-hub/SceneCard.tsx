"use client";

import { useState } from "react";
import { Scene } from "@/types/creative-hub";
import { regenerateScene, generateShots } from "@/services/creative-hub";
import { Loader2, RefreshCw, Film, MapPin, Clock } from "lucide-react";
import { toast } from "react-toastify";
import { clsx } from "clsx";

interface SceneCardProps {
  scene: Scene;
  onUpdate?: () => void;
}

export default function SceneCard({ scene, onUpdate }: SceneCardProps) {
  const [regenerating, setRegenerating] = useState(false);
  const [generatingShots, setGeneratingShots] = useState(false);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await regenerateScene(scene.id);
      toast.success("Scene regeneration started.");
      onUpdate?.();
    } catch (error) {
      console.error("Failed to regenerate scene", error);
      toast.error("Failed to regenerate scene.");
    } finally {
      setRegenerating(false);
    }
  };

  const handleGenerateShots = async () => {
    setGeneratingShots(true);
    try {
      await generateShots(scene.id);
      toast.success("Shot generation started.");
    } catch (error) {
      console.error("Failed to generate shots", error);
      toast.error("Failed to generate shots.");
    } finally {
      setGeneratingShots(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-all group relative overflow-hidden">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
            <span className="bg-gray-800 text-gray-400 text-xs px-2 py-1 rounded">#{scene.order}</span>
            {scene.scene_name || `Scene ${scene.order}`}
          </h3>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
             <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>{scene.int_ext} {scene.location}</span>
             </div>
             <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{scene.time}</span>
             </div>
          </div>
        </div>
      </div>
      
      <p className="text-gray-400 text-sm mb-6 line-clamp-3">
        {scene.description}
      </p>

      <div className="flex gap-3 mt-auto pt-4 border-t border-gray-800/50">
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium transition-colors"
        >
          {regenerating ? <Loader2 className="animate-spin h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
          Regenerate
        </button>
        <button
          onClick={handleGenerateShots}
          disabled={generatingShots}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-600/20 text-sm font-medium transition-colors"
        >
          {generatingShots ? <Loader2 className="animate-spin h-4 w-4" /> : <Film className="h-4 w-4" />}
          Gen Shots
        </button>
      </div>
      
      {/* Visual flair for active generating state */}
      {(regenerating || generatingShots) && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-indigo-500/50 animate-pulse" />
      )}
    </div>
  );
}
