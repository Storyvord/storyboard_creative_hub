import { Character } from "@/types/creative-hub";
import { X, User, Edit, Trash2, Wand2, Plus, Save, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { createCharacter, updateCharacter, generateCharacterImage } from "@/services/creative-hub";
import { toast } from "react-toastify";

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
        toast.error("Failed to save character");
    } finally {
        setLoading(false);
    }
  };

  const handleGenerateImage = async () => {
      if (!character) return;
      setGenerating(true);
      try {
          await generateCharacterImage(character.id);
          toast.success("Image generation started");
          // Simple delay mainly for demo, ideally poll or websocket
          setTimeout(onUpdate, 3000);
      } catch (error) {
          console.error("Failed to generate image", error);
          toast.error("Failed to generate image");
      } finally {
          setGenerating(false);
      }
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl"
        >
          <div className="p-6 border-b border-gray-800 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {character ? <Edit className="h-5 w-5 text-indigo-500" /> : <Plus className="h-5 w-5 text-indigo-500" />}
                {character ? "Edit Character" : "Add Character"}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
               <div>
                   <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
                   <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                        placeholder="Character Name"
                        required
                   />
               </div>
               <div>
                   <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                   <textarea 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all h-32 resize-none"
                        placeholder="Character Description..."
                   />
               </div>

                {character && (
                    <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-800 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                             <div className="w-16 h-16 bg-gray-900 rounded-lg overflow-hidden border border-gray-700 relative group">
                                 {character.image_url ? (
                                     <img src={character.image_url} alt={character.name} className="w-full h-full object-cover" />
                                 ) : (
                                     <User className="h-6 w-6 text-gray-600 m-auto mt-5" />
                                 )}
                                 
                                 {/* Image Upload Overlay */}
                                 <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                     <User className="h-4 w-4 text-white" />
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
                                                 toast.error("Failed to upload image");
                                             } finally {
                                                 setLoading(false);
                                             }
                                         }}
                                     />
                                 </label>
                             </div>
                             <div>
                                <span className="text-sm text-gray-300 font-medium block">Character Image</span>
                                <span className="text-xs text-gray-500">Upload or Generate</span>
                             </div>
                         </div>
                         <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleGenerateImage}
                                disabled={generating}
                                className="px-3 py-1.5 text-xs bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-600/20 rounded-lg transition-colors flex items-center gap-2"
                            >
                                {generating ? <Wand2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                                Generate AI
                            </button>
                         </div>
                    </div>
                )}

               <div className="pt-4 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                        Save Character
                    </button>
               </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
