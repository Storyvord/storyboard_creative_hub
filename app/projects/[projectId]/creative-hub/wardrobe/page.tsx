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

  useEffect(() => {
    if (projectId) {
        fetchData();
    }
  }, [projectId]);

  const fetchData = async () => {
    try {
      const scripts = await getScripts(projectId);
      if (scripts && scripts.length > 0) {
        const currentScript = scripts[0];
        setScript(currentScript);
        
        // Fetch Cloths and Characters in parallel
        const [clothData, charData] = await Promise.all([
             getCloths(currentScript.id),
             getCharacters(currentScript.id)
        ]);
        
        setCloths(clothData || []);
        setCharacters(charData || []);
      }
    } catch (error) {
      console.error("Failed to fetch wardrobe", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: Cloth) => {
      setSelectedCloth(item);
      setIsModalOpen(true);
  }

  const handleAdd = () => {
      setSelectedCloth(null);
      setIsModalOpen(true);
  }

  const handleDelete = async (id: number) => {
      if (!confirm("Are you sure you want to delete this item?")) return;
      try {
          const { deleteCloth } = await import("@/services/creative-hub");
          await deleteCloth(id);
          toast.success("Item deleted");
          fetchData();
      } catch (error) {
           console.error("Failed to delete", error);
           toast.error("Failed to delete item");
      }
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-pink-500" /></div>;

  return (
    <div className="p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
           <h1 className="text-3xl font-bold mb-2">Wardrobe</h1>
           <p className="text-gray-400">Manage costumes and props</p>
        </div>
        <div className="flex gap-3">
             <button
                onClick={() => setIsFittingRmOpen(true)}
                disabled={!script}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium border border-gray-700 transition-all flex items-center gap-2 disabled:opacity-50"
            >
                <Shirt className="h-5 w-5" />
                Fitting Room
            </button>
            <button
                onClick={handleAdd}
                disabled={!script}
                className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg font-medium shadow-lg shadow-pink-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Plus className="h-5 w-5" />
                Add Item
            </button>
        </div>
      </header>
      
      {cloths.length === 0 ? (
        <div className="text-center py-20 bg-gray-900/50 rounded-xl border border-dashed border-gray-800">
            <p className="text-gray-500">No items found. Generate scenes or add manually.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {cloths.map((item) => (
            <div key={item.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden group hover:border-pink-500/50 transition-all flex flex-col">
               <div className="aspect-[3/4] bg-gray-800 relative group-hover:opacity-90 transition-opacity">
                   {item.image_url ? (
                       <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                   ) : (
                       <div className="w-full h-full flex flex-col items-center justify-center text-gray-700">
                           <span className="text-lg font-bold mb-2 text-center px-2">{item.cloth_type}</span>
                           <span className="text-xs uppercase tracking-wider">No Image</span>
                       </div>
                   )}
                   <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 rounded text-xs text-white capitalize backdrop-blur-sm">
                       {item.cloth_type?.replace('_', ' ')}
                   </div>
                   
                   {/* Overlay Actions */}
                   <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                       <button 
                            onClick={() => handleEdit(item)}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors" 
                            title="Edit"
                       >
                           <Edit className="h-4 w-4" />
                       </button>
                       <button 
                            onClick={() => handleDelete(item.id)}
                            className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-full text-red-500 backdrop-blur-sm transition-colors" 
                            title="Delete"
                       >
                           <Trash2 className="h-4 w-4" />
                       </button>
                   </div>
               </div>
               <div className="p-4 flex-1 flex flex-col">
                   <h3 className="font-bold text-lg mb-1 text-white">{item.name}</h3>
                   <p className="text-xs text-gray-500 line-clamp-2 mb-4 flex-1">{item.description}</p>
                   
                   <button 
                        onClick={() => handleEdit(item)}
                        className="w-full py-2 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors border border-gray-700"
                   >
                       View Details
                   </button>
               </div>
            </div>
          ))}
        </div>
      )}

      {script && (
          <WardrobeModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            cloth={selectedCloth}
            scriptId={script.id}
            onUpdate={fetchData}
          />
      )}
      
      {script && (
          <FittingRoom 
            isOpen={isFittingRmOpen}
            onClose={() => setIsFittingRmOpen(false)}
            characters={characters}
            cloths={cloths}
          />
      )}
    </div>
  );
}
