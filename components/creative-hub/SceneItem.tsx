import { Scene, Shot } from "@/types/creative-hub";
import { Film, Image as ImageIcon, Loader2 } from "lucide-react";
import { clsx } from "clsx";

interface SceneItemProps {
    scene: Scene;
    shots: Shot[];
    isSelected: boolean;
    onToggleSelect: (sceneId: number) => void;
    onShotClick: (shot: Shot) => void;
    loadingShots: boolean;
    onGenerateShots: (sceneId: number) => void;
}

export default function SceneItem({
    scene,
    shots,
    isSelected,
    onToggleSelect,
    onShotClick,
    loadingShots,
    onGenerateShots
}: SceneItemProps) {
    return (
        <div className={clsx(
            "bg-gray-900 border rounded-xl overflow-hidden transition-all mb-8",
            isSelected ? "border-indigo-500/50 shadow-lg shadow-indigo-900/20" : "border-gray-800 hover:border-gray-700"
        )}>
            {/* Scene Header */}
            <div className="p-4 border-b border-gray-800 flex items-start gap-4 bg-gray-900/50">
                <div className="pt-1">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(scene.id)}
                        className="h-5 w-5 rounded border-gray-700 bg-gray-800 text-indigo-600 focus:ring-indigo-500/50 cursor-pointer"
                    />
                </div>
                <div className="flex-1">
                     <div className="flex items-center gap-2 mb-1">
                        <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded text-xs font-medium border border-indigo-500/20">
                            Scene {scene.order}
                        </span>
                        <h3 className="font-bold text-lg text-white">{scene.scene_name || "Untitled Scene"}</h3>
                    </div>
                    <p className="text-gray-400 text-sm line-clamp-2">{scene.description}</p>
                </div>
                <div>
                     {shots.length === 0 && !loadingShots && (
                        <button
                            onClick={() => onGenerateShots(scene.id)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <Film className="w-4 h-4" />
                            Generate Shots
                        </button>
                    )}
                </div>
            </div>

            {/* Horizontal Shots List */}
            <div className="p-4 bg-gray-950/30">
                {loadingShots ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
                    </div>
                ) : shots.length > 0 ? (
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                        {shots.map((shot) => (
                            <div
                                key={shot.id}
                                onClick={() => onShotClick(shot)}
                                className="flex-shrink-0 w-64 group cursor-pointer"
                            >
                                <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden border border-gray-800 group-hover:border-indigo-500/50 transition-all relative">
                                    {shot.image_url ? (
                                        <img src={shot.image_url} alt={`Shot ${shot.order}`} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-700 gap-2">
                                            <ImageIcon className="w-8 h-8 opacity-20" />
                                            <span className="text-xs">No Previz</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                    <div className="absolute bottom-2 right-2 bg-black/70 px-1.5 py-0.5 rounded text-[10px] text-white font-medium backdrop-blur-sm">
                                        Shot {shot.order}
                                    </div>
                                </div>
                                <p className="text-gray-400 text-xs mt-2 line-clamp-2 group-hover:text-gray-300 transition-colors">
                                    {shot.description}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-8 text-center">
                        <p className="text-gray-600 text-sm">No shots available for this scene.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
