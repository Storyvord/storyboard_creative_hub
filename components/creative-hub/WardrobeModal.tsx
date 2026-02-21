import { Cloth } from "@/types/creative-hub";
import { X, Shirt, Edit, Trash2, Wand2, Plus, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { createCloth, updateCloth, generateClothImage } from "@/services/creative-hub";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";

interface WardrobeModalProps {
  cloth?: Cloth | null;
  scriptId: number;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const CLOTH_TYPES = [
    { value: 'top', label: 'Top' },
    { value: 'bottom', label: 'Bottom' },
    { value: 'shoes', label: 'Shoes' },
    { value: 'accessory', label: 'Accessory' },
    { value: 'full_outfit', label: 'Full Outfit' },
    { value: 'hat', label: 'Hat' },
];

export default function WardrobeModal({ cloth, scriptId, isOpen, onClose, onUpdate }: WardrobeModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clothType, setClothType] = useState("full_outfit");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (cloth) {
        setName(cloth.name);
        setDescription(cloth.description || "");
        setClothType(cloth.cloth_type || "full_outfit");
    } else {
        setName("");
        setDescription("");
        setClothType("full_outfit");
    }
  }, [cloth, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        if (cloth) {
            await updateCloth(cloth.id, { name, description, cloth_type: clothType });
            toast.success("Item updated");
        } else {
            await createCloth(scriptId, { name, description, cloth_type: clothType });
            toast.success("Item created");
        }
        onUpdate();
        onClose();
    } catch (error) {
        console.error("Failed to save item", error);
        toast.error("Failed to save item");
    } finally {
        setLoading(false);
    }
  };

  const handleGenerateImage = async () => {
      if (!cloth) return;
      setGenerating(true);
      try {
          await generateClothImage(cloth.id);
          toast.success("Image generation started");
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
                {cloth ? <Edit className="h-5 w-5 text-pink-500" /> : <Plus className="h-5 w-5 text-pink-500" />}
                {cloth ? "Edit Item" : "Add Item"}
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
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-pink-500/50 outline-none transition-all"
                        placeholder="Item Name"
                        required
                   />
               </div>
               
               <div>
                   <label className="block text-sm font-medium text-gray-400 mb-1">Type</label>
                   <select
                        value={clothType}
                        onChange={(e) => setClothType(e.target.value)}
                         className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-pink-500/50 outline-none transition-all"
                   >
                       {CLOTH_TYPES.map(type => (
                           <option key={type.value} value={type.value}>{type.label}</option>
                       ))}
                   </select>
               </div>

               <div>
                   <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                   <textarea 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-pink-500/50 outline-none transition-all h-24 resize-none"
                        placeholder="Item Description..."
                   />
               </div>

                {cloth && (
                    <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-800 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                             <div className="w-10 h-10 bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
                                 {cloth.image_url ? (
                                     <img src={cloth.image_url} alt={cloth.name} className="w-full h-full object-cover" />
                                 ) : (
                                     <Shirt className="h-5 w-5 text-gray-600 m-auto mt-2" />
                                 )}
                             </div>
                             <span className="text-sm text-gray-300">Item Image</span>
                         </div>
                         <button
                            type="button"
                            onClick={handleGenerateImage}
                            disabled={generating}
                            className="px-3 py-1.5 text-xs bg-pink-600/10 hover:bg-pink-600/20 text-pink-400 border border-pink-600/20 rounded-lg transition-colors flex items-center gap-2"
                         >
                             {generating ? <Wand2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                             Generate
                         </button>
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
                        className="px-6 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg font-medium shadow-lg shadow-pink-500/20 transition-all flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                        Save Item
                    </button>
               </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
