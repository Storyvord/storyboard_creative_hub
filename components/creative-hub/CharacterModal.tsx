import { Character } from "@/types/creative-hub";
import { X, User, Edit, Wand2, Plus, Save, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { createCharacter, updateCharacter, generateCharacterImage } from "@/services/creative-hub";
import ModelSelector from "@/components/creative-hub/ModelSelector";
import { toast } from "react-toastify";
import { extractApiError } from "@/lib/extract-api-error";

interface CharacterModalProps {
  character?: Character | null;
  scriptId: number;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function CharacterModal({ character, scriptId, isOpen, onClose, onUpdate }: CharacterModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);

  useEffect(() => {
    if (character) {
        setName(character.name);
        setDescription(character.description || "");
    } else {
        setName("");
        setDescription("");
    }
  }, [character, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        if (character) {
            await updateCharacter(character.id, { name, description });
            toast.success("Character updated");
        } else {
            await createCharacter(scriptId, { name, description });
            toast.success("Character created");
        }
        onUpdate();
        onClose();
    } catch (error) {
        console.error("Failed to save character", error);
        toast.error(extractApiError(error, "Failed to save character."));
    } finally {
        setLoading(false);
    }
  };

  const handleGenerateImage = async () => {
      if (!character) return;
      setIsModelSelectorOpen(true);
  }

  const handleModelConfirm = async (model: string, provider: string) => {
      if (!character) return;
      setIsModelSelectorOpen(false);
      setGenerating(true);
      try {
          await generateCharacterImage(character.id, model, provider);
          toast.success("Image generation started");
          setTimeout(onUpdate, 3000);
      } catch (error) {
          console.error("Failed to generate image", error);
          toast.error(extractApiError(error, "Failed to generate image."));
      } finally {
          setGenerating(false);
      }
  }

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          key="character-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-md w-full max-w-lg overflow-hidden flex flex-col shadow-2xl"
          >
            <div className="p-5 border-b border-[#1a1a1a] flex justify-between items-center">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  {character ? <Edit className="h-4 w-4 text-emerald-500" /> : <Plus className="h-4 w-4 text-emerald-500" />}
                  {character ? "Edit Character" : "Add Character"}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[#1a1a1a] rounded-md text-[#555] hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                 <div>
                     <label className="block text-[10px] font-bold text-[#555] uppercase tracking-widest mb-1.5">Name</label>
                     <input 
                          type="text" 
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-[#111] border border-[#222] rounded-md px-3 py-2 text-white text-sm focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/40 outline-none transition-all"
                          placeholder="Character Name"
                          required
                     />
                 </div>
                 <div>
                     <label className="block text-[10px] font-bold text-[#555] uppercase tracking-widest mb-1.5">Description</label>
                     <textarea 
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="w-full bg-[#111] border border-[#222] rounded-md px-3 py-2 text-white text-sm focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/40 outline-none transition-all h-28 resize-none"
                          placeholder="Character description..."
                     />
                 </div>

                  {character && (
                      <div className="bg-[#111] p-3 rounded-md border border-[#1a1a1a] flex items-center justify-between">
                           <div className="flex items-center gap-3">
                               <div className="w-14 h-14 bg-[#0a0a0a] rounded-md overflow-hidden border border-[#222] relative group">
                                   {character.image_url ? (
                                       <img src={character.image_url} alt={character.name} className="w-full h-full object-cover" />
                                   ) : (
                                       <User className="h-5 w-5 text-[#333] m-auto mt-4" />
                                   )}
                                   <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                       <User className="h-3.5 w-3.5 text-white" />
                                       <input 
                                           type="file" 
                                           className="hidden" 
                                           accept="image/*"
                                           onChange={async (e) => {
                                               const file = e.target.files?.[0];
                                               if (!file) return;
                                               setLoading(true);
                                               try {
                                                   await updateCharacter(character.id, { image_url: file });
                                                   toast.success("Image updated");
                                                   onUpdate();
                                               } catch (error) {
                                                   console.error("Failed to upload image", error);
                                                   toast.error(extractApiError(error, "Failed to upload image."));
                                               } finally {
                                                   setLoading(false);
                                               }
                                           }}
                                       />
                                   </label>
                               </div>
                               <div>
                                  <span className="text-xs text-[#999] font-medium block">Character Image</span>
                                  <span className="text-[10px] text-[#555]">Upload or Generate</span>
                               </div>
                           </div>
                           <button
                               type="button"
                               onClick={handleGenerateImage}
                               disabled={generating}
                               className="px-3 py-1.5 text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-md transition-colors flex items-center gap-1.5 font-medium"
                           >
                               {generating ? <Wand2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                               Generate AI
                           </button>
                      </div>
                  )}

                 <div className="pt-3 flex justify-end gap-2">
                      <button
                          type="button"
                          onClick={onClose}
                          className="px-4 py-2 text-[#888] hover:text-white transition-colors text-sm"
                      >
                          Cancel
                      </button>
                      <button
                          type="submit"
                          disabled={loading}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-sm font-medium transition-all flex items-center gap-2"
                      >
                          {loading ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                          Save
                      </button>
                 </div>
            </form>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* ModelSelector outside AnimatePresence to fix duplicate key error */}
      <ModelSelector
        isOpen={isModelSelectorOpen}
        onClose={() => setIsModelSelectorOpen(false)}
        onConfirm={handleModelConfirm}
        itemCount={1}
        title="Select Model for Character Image"
        confirmLabel="Generate Image"
      />
    </>
  );
}
