"use client";

import { useState, useEffect } from "react";
import { Cloth, Character } from "@/types/creative-hub";
import { X, Shirt, User, Check, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { clsx } from "clsx";

interface FittingRoomProps {
    isOpen: boolean;
    onClose: () => void;
    characters: Character[];
    cloths: Cloth[];
}

const CLOTH_TYPES = [
    { value: 'top', label: 'Tops' },
    { value: 'bottom', label: 'Bottoms' },
    { value: 'shoes', label: 'Shoes' },
    { value: 'accessory', label: 'Accessories' },
    { value: 'hat', label: 'Hats' },
    { value: 'full_outfit', label: 'Full Outfits' },
];

export default function FittingRoom({ isOpen, onClose, characters, cloths }: FittingRoomProps) {
    const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
    const [selectedItems, setSelectedItems] = useState<Record<string, Cloth | undefined>>({});
    const [activeCategory, setActiveCategory] = useState<string>('full_outfit');

    // Reset selection when character changes (optional, but realistic)
    useEffect(() => {
        if (!isOpen) {
            setSelectedCharacter(null);
            setSelectedItems({});
        }
    }, [isOpen]);

    const handleEquip = (item: Cloth) => {
        const type = item.cloth_type || 'accessory';
        setSelectedItems(prev => ({
            ...prev,
            [type]: prev[type]?.id === item.id ? undefined : item // Toggle
        }));
    };

    if (!isOpen) return null;

    const filteredCloths = cloths.filter(c => (c.cloth_type || 'full_outfit') === activeCategory);

    return (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="h-16 border-b border-gray-800 flex justify-between items-center px-6 bg-gray-900">
                <div className="flex items-center gap-3">
                    <Sparkles className="text-pink-500 h-6 w-6" />
                    <h1 className="text-xl font-bold text-white tracking-wider">FITTING ROOM</h1>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
                    <X className="h-8 w-8" />
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left: Character Selection */}
                <div className="w-80 border-r border-gray-800 bg-gray-900/50 flex flex-col">
                    <div className="p-4 border-b border-gray-800">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Select Model</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {characters.map(char => (
                                <button
                                    key={char.id}
                                    onClick={() => setSelectedCharacter(char)}
                                    className={clsx(
                                        "p-2 rounded-xl border transition-all text-left group relative overflow-hidden",
                                        selectedCharacter?.id === char.id 
                                            ? "bg-pink-600/20 border-pink-500" 
                                            : "bg-gray-800/50 border-gray-700 hover:border-gray-600"
                                    )}
                                >
                                    <div className="aspect-square bg-gray-900 rounded-lg mb-2 overflow-hidden">
                                        {char.image_url ? (
                                            <img src={char.image_url} alt={char.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="h-8 w-8 text-gray-700 m-auto mt-4" />
                                        )}
                                    </div>
                                    <span className="text-xs font-medium text-gray-300 group-hover:text-white transition-colors">{char.name}</span>
                                    {selectedCharacter?.id === char.id && (
                                        <div className="absolute top-2 right-2 bg-pink-500 rounded-full p-0.5">
                                            <Check className="h-3 w-3 text-white" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Center: Visualization Stage */}
                <div className="flex-1 bg-gradient-to-b from-gray-900 to-black flex items-center justify-center relative p-8">
                     <div className="relative h-full aspect-[3/4] max-h-[800px] border-2 border-gray-800/50 rounded-2xl bg-gray-900 overflow-hidden shadow-2xl flex items-center justify-center">
                         {/* Background / Environment could go here */}
                         
                         {/* Character Layer */}
                         {selectedCharacter ? (
                             <div className="relative w-full h-full">
                                 {selectedCharacter.image_url ? (
                                     <img src={selectedCharacter.image_url} className="w-full h-full object-cover opacity-80" />
                                 ) : (
                                     <div className="w-full h-full flex items-center justify-center">
                                         <User className="w-64 h-64 text-gray-800" />
                                     </div>
                                 )}
                                 
                                 {/* Simple Overlay Visualization (Since we don't have compositing yet) */}
                                 {Object.entries(selectedItems).map(([type, item], idx) => (
                                     item && item.image_url && (
                                        <div key={type} className="absolute inset-0 z-10 pointer-events-none mix-blend-normal">
                                            {/* Note: In a real app we'd need masked images or specific positioning. 
                                                For now just showing it centered or overlaying roughly. */}
                                            <img 
                                                src={item.image_url} 
                                                className="w-full h-full object-contain drop-shadow-2xl" 
                                                style={{ 
                                                    transform: type === 'hat' ? 'translateY(-30%) scale(0.3)' : 
                                                               type === 'shoes' ? 'translateY(40%) scale(0.4)' : 'none'
                                                }}
                                            />
                                            {/* Label for demo clarity */}
                                            <div className="absolute top-4 left-4 bg-black/70 px-2 py-1 rounded text-xs text-white border border-white/10">
                                                {item.cloth_type}: {item.name}
                                            </div>
                                        </div>
                                     )
                                 ))}
                             </div>
                         ) : (
                             <div className="text-center text-gray-500">
                                 <User className="w-20 h-20 mx-auto mb-4 opacity-20" />
                                 <p>Select a character to start fitting</p>
                             </div>
                         )}

                         {/* Controls Overlay */}
                         <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4">
                             <button className="px-6 py-3 bg-pink-600 hover:bg-pink-500 text-white rounded-full font-bold shadow-lg shadow-pink-600/20 transition-transform active:scale-95 flex items-center gap-2">
                                 <Sparkles className="w-4 h-4" />
                                 Generate Look
                             </button>
                         </div>
                     </div>
                </div>

                {/* Right: Wardrobe Selector */}
                <div className="w-96 border-l border-gray-800 bg-gray-900/50 flex flex-col">
                    {/* Categories */}
                    <div className="flex p-2 gap-2 overflow-x-auto border-b border-gray-800 scrollbar-hide">
                        {CLOTH_TYPES.map(type => (
                            <button
                                key={type.value}
                                onClick={() => setActiveCategory(type.value)}
                                className={clsx(
                                    "px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                                    activeCategory === type.value 
                                        ? "bg-white text-black" 
                                        : "bg-gray-800 text-gray-400 hover:text-white"
                                )}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>

                    {/* Items Grid */}
                    <div className="flex-1 p-4 overflow-y-auto">
                        <div className="grid grid-cols-2 gap-3">
                            {filteredCloths.map(item => {
                                const isEquipped = selectedItems[item.cloth_type || 'full_outfit']?.id === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleEquip(item)}
                                        className={clsx(
                                            "aspect-[3/4] rounded-xl border relative overflow-hidden group transition-all text-left",
                                            isEquipped 
                                                ? "border-pink-500 ring-2 ring-pink-500/20" 
                                                : "border-gray-800 hover:border-gray-600"
                                        )}
                                    >
                                        <div className="w-full h-full bg-black">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Shirt className="w-8 h-8 text-gray-700" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                                            <p className="text-xs font-medium text-white truncate">{item.name}</p>
                                        </div>
                                        {isEquipped && (
                                            <div className="absolute top-2 right-2 bg-pink-500 rounded-full p-1 shadow-lg">
                                                <Check className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
