import { Cloth } from "@/types/creative-hub";
import { X, Shirt, Wand2, Plus, Save, Upload, Edit } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { createCloth, updateCloth, generateClothImage } from "@/services/creative-hub";
import ModelSelector from "@/components/creative-hub/ModelSelector";
import { toast } from "react-toastify";
import { extractApiError } from "@/lib/extract-api-error";
import { Loader2 } from "lucide-react";

interface WardrobeModalProps {
  cloth?: Cloth | null;
  scriptId: number;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onGenerationStarted?: (taskId: string, clothId: number) => void;
}

const CLOTH_TYPES = [
  { value: 'torso',       label: 'Torso'      },
  { value: 'legs',        label: 'Legs'       },
  { value: 'feet',        label: 'Feet'       },
  { value: 'hands',       label: 'Hands'      },
  { value: 'head',        label: 'Head'       },
  { value: 'face',        label: 'Face'       },
  { value: 'full_body',   label: 'Full Body'  },
  { value: 'accessories', label: 'Accessories'},
];

export default function WardrobeModal({ cloth, scriptId, isOpen, onClose, onUpdate, onGenerationStarted }: WardrobeModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clothType, setClothType] = useState("full_body");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cloth) {
      setName(cloth.name);
      setDescription(cloth.description || "");
      setClothType(cloth.cloth_type || "full_body");
      setImagePreview(cloth.image_url || null);
    } else {
      setName("");
      setDescription("");
      setClothType("full_body");
      setImagePreview(null);
    }
    setImageFile(null);
  }, [cloth, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name is required");
    setLoading(true);
    try {
      if (cloth) {
        await updateCloth(cloth.id, {
          name,
          description,
          cloth_type: clothType,
          ...(imageFile ? { image_url: imageFile as unknown as string } : {}),
        } as Parameters<typeof updateCloth>[1]);
        toast.success("Item updated");
      } else {
        await createCloth(scriptId, {
          name,
          description,
          cloth_type: clothType,
          ...(imageFile ? { image: imageFile } : {}),
        });
        toast.success("Item created");
      }
      onUpdate();
      onClose();
    } catch (error) {
      toast.error(extractApiError(error, "Failed to save item."));
    } finally {
      setLoading(false);
    }
  };

  const handleModelConfirm = async (model: string, provider: string) => {
    if (!cloth) return;
    setIsModelSelectorOpen(false);
    setGenerating(true);
    try {
      const result = await generateClothImage(cloth.id, model, provider);
      toast.success("Cloth image rendering — will update when ready…");
      onGenerationStarted?.(result.task_id, cloth.id);
    } catch (error) {
      toast.error(extractApiError(error, "Failed to generate image."));
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          key="wardrobe-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={e => e.stopPropagation()}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                {cloth ? <Edit className="h-4 w-4 text-emerald-400" /> : <Plus className="h-4 w-4 text-emerald-400" />}
                {cloth ? "Edit Wardrobe Item" : "Add Wardrobe Item"}
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-[var(--surface-hover)] rounded-lg text-[var(--text-muted)] hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-5 space-y-4">
                {/* Image upload area */}
                <div>
                  <label className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest font-semibold block mb-2">
                    Reference Image
                  </label>
                  <div
                    className="relative aspect-[3/4] rounded-lg bg-[var(--background)] border border-[var(--border)] overflow-hidden cursor-pointer group"
                    onClick={() => fileRef.current?.click()}
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-muted)] gap-2">
                        <Shirt className="h-8 w-8 opacity-30" />
                        <span className="text-[10px] text-[var(--text-muted)]">Click to upload image</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                      <Upload className="h-5 w-5 text-white" />
                      <span className="text-[10px] text-white/80">
                        {imagePreview ? "Change image" : "Upload image"}
                      </span>
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                  {/* AI generate — only available for existing items */}
                  {cloth && (
                    <button
                      type="button"
                      onClick={() => setIsModelSelectorOpen(true)}
                      disabled={generating}
                      className="mt-2 w-full py-2 text-[10px] font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
                    >
                      {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                      Generate AI Image
                    </button>
                  )}
                </div>

                {/* Name + Type row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest font-semibold block mb-1.5">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-emerald-500/50 transition-colors placeholder:text-[var(--text-muted)]"
                      placeholder="e.g. Leather Jacket"
                      required
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest font-semibold block mb-1.5">
                      Category
                    </label>
                    <select
                      value={clothType}
                      onChange={e => setClothType(e.target.value)}
                      className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                    >
                      {CLOTH_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest font-semibold block mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Material, colour, condition, era, special details…"
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[#bbb] focus:outline-none focus:border-emerald-500/50 transition-colors resize-none placeholder:text-[var(--text-muted)]"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-[var(--border)] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs text-[#777] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-40"
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {cloth ? "Save Changes" : "Add Item"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <ModelSelector
        isOpen={isModelSelectorOpen}
        onClose={() => setIsModelSelectorOpen(false)}
        onConfirm={handleModelConfirm}
        itemCount={1}
        title="Generate Wardrobe Image"
        confirmLabel="Generate"
      />
    </>
  );
}
