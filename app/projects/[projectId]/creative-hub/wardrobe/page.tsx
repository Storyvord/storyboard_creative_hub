"use client";

import { useState, useEffect } from "react";
import { getScripts, getCloths, getCharacters } from "@/services/creative-hub";
import { Script, Cloth, Character } from "@/types/creative-hub";
import { Loader2, Plus, Edit, Trash2, Shirt } from "lucide-react";
import { useParams } from "next/navigation";
import WardrobeModal from "@/components/creative-hub/WardrobeModal";
import FittingRoom from "@/components/creative-hub/FittingRoom";
import { toast } from "react-toastify";

export default function WardrobePage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [cloths, setCloths] = useState<Cloth[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [script, setScript] = useState<Script | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFittingRmOpen, setIsFittingRmOpen] = useState(false);
  const [selectedCloth, setSelectedCloth] = useState<Cloth | null>(null);

  useEffect(() => { if (projectId) fetchData(); }, [projectId]);

  const fetchData = async () => {
    try {
      const scripts = await getScripts(projectId);
      if (scripts && scripts.length > 0) {
        const currentScript = scripts[0];
        setScript(currentScript);
        const [clothData, charData] = await Promise.all([getCloths(currentScript.id), getCharacters(currentScript.id)]);
        setCloths(clothData || []);
        setCharacters(charData || []);
      }
    } catch (error) { console.error("Failed to fetch wardrobe", error); }
    finally { setLoading(false); }
  };

  const handleEdit = (item: Cloth) => { setSelectedCloth(item); setIsModalOpen(true); };
  const handleAdd = () => { setSelectedCloth(null); setIsModalOpen(true); };

  const handleDelete = async (id: number) => {
      if (!confirm("Delete this item?")) return;
      try {
          const { deleteCloth } = await import("@/services/creative-hub");
          await deleteCloth(id);
          toast.success("Item deleted");
          fetchData();
      } catch (error) { console.error(error); toast.error("Failed to delete item"); }
  };

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="animate-spin h-6 w-6 text-[#333]" /></div>;

  return (
    <div className="p-6">
      <header className="flex justify-between items-center mb-6">
        <div>
           <h1 className="text-xl font-bold mb-1 text-white">Wardrobe</h1>
           <p className="text-[#555] text-xs">Manage costumes and props</p>
        </div>
        <div className="flex gap-2">
             <button onClick={() => setIsFittingRmOpen(true)} disabled={!script}
                className="px-3 py-2 bg-[#161616] hover:bg-[#1a1a1a] text-white rounded-md text-xs font-medium border border-[#222] transition-all flex items-center gap-1.5 disabled:opacity-30">
                <Shirt className="h-3.5 w-3.5" />
                Fitting Room
            </button>
            <button onClick={handleAdd} disabled={!script}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-30">
                <Plus className="h-3.5 w-3.5" />
                Add Item
            </button>
        </div>
      </header>
      
      {cloths.length === 0 ? (
        <div className="text-center py-16 bg-[#0d0d0d] rounded-md border border-dashed border-[#1a1a1a]">
            <p className="text-[#555] text-xs">No items found. Generate scenes or add manually.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {cloths.map((item) => (
            <div key={item.id} className="bg-[#0d0d0d] rounded-md border border-[#1a1a1a] overflow-hidden group hover:border-emerald-500/30 transition-all flex flex-col">
               <div className="aspect-[3/4] bg-[#0a0a0a] relative group-hover:opacity-90 transition-opacity">
                   {item.image_url ? (
                       <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                   ) : (
                       <div className="w-full h-full flex flex-col items-center justify-center text-[#333]">
                           <span className="text-base font-bold mb-1 text-center px-2">{item.cloth_type}</span>
                           <span className="text-[9px] uppercase tracking-wider">No Image</span>
                       </div>
                   )}
                   <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-black/60 rounded text-[9px] text-white capitalize backdrop-blur-sm">
                       {item.cloth_type?.replace('_', ' ')}
                   </div>
                   <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                       <button onClick={() => handleEdit(item)} className="p-2 bg-white/10 hover:bg-white/20 rounded-md text-white transition-colors" title="Edit">
                           <Edit className="h-3.5 w-3.5" />
                       </button>
                       <button onClick={() => handleDelete(item.id)} className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-md text-red-400 transition-colors" title="Delete">
                           <Trash2 className="h-3.5 w-3.5" />
                       </button>
                   </div>
               </div>
               <div className="p-3 flex-1 flex flex-col">
                   <h3 className="font-bold text-sm mb-0.5 text-white">{item.name}</h3>
                   <p className="text-[10px] text-[#555] line-clamp-2 mb-3 flex-1">{item.description}</p>
                   <button onClick={() => handleEdit(item)}
                        className="w-full py-1.5 text-[10px] font-medium bg-[#111] hover:bg-[#161616] text-[#888] rounded-md transition-colors border border-[#1a1a1a]">
                       View Details
                   </button>
               </div>
            </div>
          ))}
        </div>
      )}

      {script && (
          <WardrobeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} cloth={selectedCloth} scriptId={script.id} onUpdate={fetchData} />
      )}
      
      {script && (
          <FittingRoom isOpen={isFittingRmOpen} onClose={() => setIsFittingRmOpen(false)} characters={characters} cloths={cloths} />
      )}
    </div>
  );
}
