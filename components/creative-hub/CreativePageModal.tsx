"use client";

import { useState } from "react";
import { X, Image as ImageIcon, Loader2, Sparkles, Wand2 } from "lucide-react";
import { ASPECT_RATIOS } from "@/app/projects/[projectId]/creative-hub/storyboard/page";

import { createScriptPrevisualization } from "@/services/creative-hub";

interface CreativePageModalProps {
  isOpen: boolean;
  onClose: () => void;
  scriptId: number | null;
}

export default function CreativePageModal({ isOpen, onClose, scriptId }: CreativePageModalProps) {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [cameraAngle, setCameraAngle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!scriptId) return;
    setIsGenerating(true);
    try {
      const response = await createScriptPrevisualization({
        script: scriptId,
        description: prompt,
        aspect_ratio: aspectRatio,
        camera_angle: cameraAngle || undefined,
        generate_ai_image: true,
      });
      if (response && response.image_url) {
        setGeneratedImageUrl(response.image_url);
      }
    } catch (error) {
      console.error("Failed to generate script previsualization:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-4xl bg-[#0d0d0d] border border-[#222] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1a1a1a]">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" /> Creative Page
          </h2>
          <button onClick={onClose} className="text-[#666] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          
          {/* Main Preview Area */}
          <div className="flex-1 p-6 flex flex-col relative bg-[#050505]">
            <div className="flex-1 border border-[#222] rounded-lg bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
              {generatedImageUrl ? (
                <img src={generatedImageUrl} alt="Generated Previz" className="w-full h-full object-contain" />
              ) : (
                <div className="text-center text-[#444] flex flex-col items-center">
                  <ImageIcon className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm">Describe a scene and generate your previsualization.</p>
                </div>
              )}

              {isGenerating && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center backdrop-blur-sm z-10 transition-all">
                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
                  <p className="text-emerald-400 font-medium text-sm animate-pulse">Crafting your vision...</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar / Bottom Bar (Parameters) */}
          <div className="w-full md:w-80 bg-[#111] border-l border-[#1a1a1a] flex flex-col overflow-y-auto">
            <div className="p-5 space-y-5">
              
              <div>
                <label className="block text-xs font-medium text-[#888] mb-1.5 uppercase tracking-wider">Prompt</label>
                <textarea
                  className="w-full bg-[#0a0a0a] border border-[#222] rounded-md text-sm text-white px-3 py-2 outline-none focus:border-emerald-500/50 transition-colors resize-none placeholder-[#444]"
                  rows={4}
                  placeholder="Describe the environment, characters, and action in detail..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#888] mb-1.5 uppercase tracking-wider">Aspect Ratio</label>
                <select
                  className="w-full bg-[#0a0a0a] border border-[#222] rounded-md text-sm text-white px-3 py-2 outline-none focus:border-emerald-500/50 transition-colors"
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                >
                  {ASPECT_RATIOS.map(ar => <option key={ar} value={ar}>{ar}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#888] mb-1.5 uppercase tracking-wider">Camera Angle</label>
                <input
                  type="text"
                  className="w-full bg-[#0a0a0a] border border-[#222] rounded-md text-sm text-white px-3 py-2 outline-none focus:border-emerald-500/50 transition-colors placeholder-[#444]"
                  placeholder="e.g., Low angle, Eye level"
                  value={cameraAngle}
                  onChange={(e) => setCameraAngle(e.target.value)}
                />
              </div>

            </div>
            
            <div className="p-5 border-t border-[#1a1a1a] mt-auto">
              <button 
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {isGenerating ? "Generating..." : "Generate Previz"}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
