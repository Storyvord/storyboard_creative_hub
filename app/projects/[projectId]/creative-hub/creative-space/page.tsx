"use client";

import { useState, useEffect } from "react";
import { Loader2, Send, LayoutPanelTop, MonitorPlay } from "lucide-react";
import { useParams } from "next/navigation";
import { getScripts, createScriptPrevisualization, getImageModels, ImageModel } from "@/services/creative-hub";
import { ASPECT_RATIOS, CAMERA_ANGLES } from "@/app/projects/[projectId]/creative-hub/storyboard/page";

const SHOT_TYPES = [
  "Close-Up",
  "Wide Shot",
  "Tracking Shot",
  "Over-The-Shoulder",
  "Medium Shot",
  "Medium Close-Up",
  "Medium Two-Shot",
  "Other",
];

const PARAM_SELECT_CLS =
  "bg-[#111] border border-[#1e1e1e] rounded-md text-xs text-white px-2 py-1.5 outline-none focus:border-emerald-500/40 transition-colors cursor-pointer";

export default function CreativeSpacePage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [scriptId, setScriptId] = useState<number | null>(null);
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [cameraAngle, setCameraAngle] = useState("");
  const [shotType, setShotType] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  // Model selection
  const [imageModels, setImageModels] = useState<ImageModel[]>([]);
  const [selectedModelName, setSelectedModelName] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("");

  useEffect(() => {
    if (!projectId) return;
    getScripts(projectId)
      .then(loaded => {
        if (loaded?.length > 0) setScriptId(prev => prev ?? loaded[0].id);
      })
      .catch(console.error);

    getImageModels()
      .then(models => {
        if (models?.length > 0) {
          setImageModels(models);
          setSelectedModelName(models[0].model_name);
          setSelectedProvider(models[0].provider);
        }
      })
      .catch(console.error);
  }, [projectId]);

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    if (imageModels[idx]) {
      setSelectedModelName(imageModels[idx].model_name);
      setSelectedProvider(imageModels[idx].provider);
    }
  };

  const selectedModelIdx = imageModels.findIndex(
    m => m.model_name === selectedModelName && m.provider === selectedProvider
  );

  const handleGenerate = async () => {
    if (!scriptId || !prompt.trim()) return;
    setIsGenerating(true);

    const tempId = Date.now();
    setHistory(prev => [
      {
        id: tempId,
        isGenerating: true,
        prompt,
        aspect_ratio: aspectRatio,
        camera_angle: cameraAngle,
        shot_type: shotType,
        model_name: selectedModelName,
      },
      ...prev,
    ]);
    setPrompt("");

    try {
      const response = await createScriptPrevisualization({
        script: scriptId,
        description: prompt,
        aspect_ratio: aspectRatio,
        camera_angle: cameraAngle || undefined,
        shot_type: shotType || undefined,
        generate_ai_image: true,
        model: selectedModelName || undefined,
        provider: selectedProvider || undefined,
      });

      if (response?.image_url) {
        setHistory(prev =>
          prev.map(item => (item.id === tempId ? { ...response, isGenerating: false, shot_type: shotType } : item))
        );
      } else {
        setHistory(prev => prev.filter(item => item.id !== tempId));
      }
    } catch (error) {
      console.error("Failed to generate script previsualization:", error);
      setHistory(prev => prev.filter(item => item.id !== tempId));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative flex flex-col h-full bg-[#0a0a0a] overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-[#1a1a1a] p-4 bg-[#0d0d0d] flex justify-between items-center z-10">
        <div>
          <h1 className="text-xl text-white font-semibold flex items-center gap-2">
            <LayoutPanelTop className="w-5 h-5 text-emerald-500" /> Creative Space
          </h1>
          <p className="text-xs text-[#666] mt-1">Generate unassigned script previsualizations.</p>
        </div>
      </div>

      {/* Main Content Area - Scrollable History Grid */}
      <div className="flex-1 overflow-y-auto p-6 pb-48 scroll-smooth">
        <div className="max-w-[1400px] mx-auto">
          {history.length === 0 ? (
            <div className="h-full min-h-[50vh] flex flex-col items-center justify-center text-[#444]">
              <MonitorPlay className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-sm">Your generated imagery will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {history.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-[#111] border border-[#222] rounded-xl overflow-hidden flex flex-col group"
                >
                  <div className="aspect-video bg-[#050505] relative flex items-center justify-center">
                    {item.isGenerating ? (
                      <div className="flex flex-col items-center justify-center">
                        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
                        <span className="text-emerald-400 text-xs font-medium animate-pulse">Generating Vision...</span>
                      </div>
                    ) : item.image_url ? (
                      <img src={item.image_url} alt="Generated Previz" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-[#333]"><MonitorPlay className="w-8 h-8" /></div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col gap-2">
                    <p className="text-sm text-[#ccc] line-clamp-3">"{item.description || item.prompt}"</p>
                    <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
                      <span className="text-[10px] bg-[#1a1a1a] px-2 py-1 rounded text-[#888] font-mono border border-[#222]">
                        {item.aspect_ratio || "16:9"}
                      </span>
                      {item.camera_angle && (
                        <span className="text-[10px] bg-[#1a1a1a] px-2 py-1 rounded border border-[#222] text-[#888] truncate max-w-[160px]">
                          {item.camera_angle}
                        </span>
                      )}
                      {item.shot_type && (
                        <span className="text-[10px] bg-[#1a1a1a] px-2 py-1 rounded border border-[#222] text-[#888] truncate max-w-[160px]">
                          {item.shot_type}
                        </span>
                      )}
                      {item.model_name && (
                        <span className="text-[10px] bg-emerald-950/40 px-2 py-1 rounded border border-emerald-900/30 text-emerald-600 truncate max-w-[200px] ml-auto">
                          {item.model_name.split("/").pop()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="h-4" />
        </div>
      </div>

      {/* Bottom Bar — absolute floating, backdrop blur, images scroll behind */}
      <div className="absolute bottom-0 left-0 right-0 pb-5 px-4 z-20 pointer-events-none">
        <div className="w-3/4 mx-auto bg-[#0d0d0d]/70 backdrop-blur-xl border border-[#ffffff08] rounded-2xl p-4 lg:p-5 shadow-[0_-4px_48px_rgba(0,0,0,0.8)] flex flex-col gap-4 pointer-events-auto">

          {/* Primary Input Row */}
          <div className="flex gap-3 items-end">
            <div className="flex-1 bg-[#111] border border-[#1e1e1e] rounded-xl p-2 focus-within:border-emerald-500/50 transition-colors flex items-center shadow-inner">
              <textarea
                className="flex-1 bg-transparent border-none outline-none text-white text-sm px-2 py-1.5 resize-none max-h-32 min-h-[44px] placeholder-[#444]"
                placeholder="Describe the environment, characters, action to envision..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                rows={1}
              />
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="ml-2 p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Parameters Row */}
          <div className="flex flex-wrap gap-x-5 gap-y-2.5 items-center px-1">

            {/* Aspect Ratio */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-[#555] uppercase tracking-wider whitespace-nowrap">Aspect Ratio</span>
              <select
                className={PARAM_SELECT_CLS}
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
              >
                {ASPECT_RATIOS.map(ar => <option key={ar} value={ar}>{ar}</option>)}
              </select>
            </div>

            {/* Shot Type */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-[#555] uppercase tracking-wider whitespace-nowrap">Shot Type</span>
              <select
                className={PARAM_SELECT_CLS}
                value={shotType}
                onChange={(e) => setShotType(e.target.value)}
              >
                <option value="">— Any —</option>
                {SHOT_TYPES.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>

            {/* Camera Angle */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-[#555] uppercase tracking-wider whitespace-nowrap">Camera Angle</span>
              <select
                className={PARAM_SELECT_CLS}
                value={cameraAngle}
                onChange={(e) => setCameraAngle(e.target.value)}
              >
                <option value="">— Any —</option>
                {CAMERA_ANGLES.map(ca => <option key={ca} value={ca}>{ca}</option>)}
              </select>
            </div>

            {/* Model */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-[10px] font-semibold text-[#555] uppercase tracking-wider whitespace-nowrap">Model</span>
              {imageModels.length === 0 ? (
                <div className="flex items-center gap-1.5 text-[#555] text-xs">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading...
                </div>
              ) : (
                <select
                  className={`${PARAM_SELECT_CLS} max-w-[280px]`}
                  value={selectedModelIdx >= 0 ? selectedModelIdx : 0}
                  onChange={handleModelChange}
                >
                  {imageModels.map((m, i) => (
                    <option key={i} value={i}>
                      {m.model_name.split("/").pop()} · {m.credits_per_image} cr
                    </option>
                  ))}
                </select>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
