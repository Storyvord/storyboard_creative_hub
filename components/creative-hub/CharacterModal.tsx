import { Character } from "@/types/creative-hub";
import { X, User, Edit, Wand2, Plus, Save, Loader2, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
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
  onGenerate?: (charId: number) => void;
}

export default function CharacterModal({ character, scriptId, isOpen, onClose, onUpdate, onGenerate }: CharacterModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (character) {
        setName(character.name);
        setDescription(character.description || "");
        setImagePreview(character.image_url || null);
    } else {
        setName("");
        setDescription("");
        setImagePreview(null);
    }
    setImageFile(null);
  }, [character, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name is required");
    setLoading(true);
    try {
        const payload = { name, description, ...(imageFile ? { image_url: imageFile } : {}) };
        if (character) {
            await updateCharacter(character.id, payload);
            toast.success("Character updated");
        } else {
            await createCharacter(scriptId, payload);
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
      // Don't require existing character. Open model selector, we'll save + generate on confirm.
      if (!name.trim()) return toast.error("Name is required before generating.");
      setIsModelSelectorOpen(true);
  }

  const handleModelConfirm = async (model: string, provider: string) => {
      setIsModelSelectorOpen(false);
      setGenerating(true);
      try {
          let charId = character?.id;
          const payload = { name, description, ...(imageFile ? { image_url: imageFile } : {}) };
          
          if (charId) {
              await updateCharacter(charId, payload);
          } else {
              const newChar = await createCharacter(scriptId, payload);
              charId = newChar.id;
          }
          
          await generateCharacterImage(charId, model, provider);
          toast.success("Character saved and image generation started");
          if (onGenerate) onGenerate(charId);
          setTimeout(onUpdate, 3000);
          onClose(); // Close modal immediately so user sees the loading state on the card
      } catch (error) {
          console.error("Failed to save & generate", error);
          toast.error(extractApiError(error, "Failed to save & generate image."));
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
            className="bg-[var(--surface)] border border-[var(--border)] rounded-md w-full max-w-lg overflow-hidden flex flex-col shadow-2xl"
          >
            <div className="p-5 border-b border-[var(--border)] flex justify-between items-center">
              <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                  {character ? <Edit className="h-4 w-4 text-emerald-500" /> : <Plus className="h-4 w-4 text-emerald-500" />}
                  {character ? "Edit Character" : "Add Character"}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[var(--surface-hover)] rounded-md text-[var(--text-muted)] hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                 <div className="flex gap-4">
                     {/* Image Uploader */}
                     <div 
                         className="w-32 h-32 shrink-0 bg-[var(--background)] rounded-md border border-[var(--border)] overflow-hidden relative cursor-pointer group"
                         onClick={() => fileRef.current?.click()}
                     >
                         {imagePreview ? (
                             <img src={imagePreview} alt="Character" className="w-full h-full object-cover" />
                         ) : (
                             <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
                                 <Upload className="h-5 w-5 mb-1 opacity-50" />
                                 <span className="text-[9px] text-center px-2">Upload Avatar</span>
                             </div>
                         )}
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                             <Upload className="h-5 w-5 text-white" />
                         </div>
                         <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                     </div>

                     <div className="flex-1 space-y-4">
                         <div>
                             <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Name *</label>
                             <input 
                                  type="text" 
                                  value={name}
                                  onChange={(e) => setName(e.target.value)}
                                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-white text-sm focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/40 outline-none transition-all"
                                  placeholder="Character Name"
                                  required
                             />
                         </div>
                         <div>
                             <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Description</label>
                             <textarea 
                                  value={description}
                                  onChange={(e) => setDescription(e.target.value)}
                                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-white text-sm focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/40 outline-none transition-all h-16 resize-none"
                                  placeholder="Character description..."
                             />
                         </div>
                     </div>
                 </div>

                 <div className="bg-[var(--surface)] p-3 rounded-md border border-[var(--border)] flex items-center justify-between mt-4">
                     <div>
                         <span className="text-xs text-[var(--text-secondary)] font-medium block">AI Portrait Generation</span>
                         <span className="text-[10px] text-[var(--text-muted)]">Instantly saves details and generates an image</span>
                     </div>
                     <button
                         type="button"
                         onClick={handleGenerateImage}
                         disabled={generating}
                         className="px-3 py-1.5 text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-md transition-colors flex items-center gap-1.5 font-medium"
                     >
                         {generating ? <Wand2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                         Save & Generate
                     </button>
                 </div>

                 <div className="pt-3 flex justify-end gap-2">
                      <button
                          type="button"
                          onClick={onClose}
                          className="px-4 py-2 text-[var(--text-secondary)] hover:text-white transition-colors text-sm"
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
