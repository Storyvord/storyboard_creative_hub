import { useState, useEffect, useRef } from "react";
import { Shot } from "@/types/creative-hub";
import { X, Play, Pause, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StoryboardSlideshowModalProps {
    isOpen: boolean;
    onClose: () => void;
    shots: Shot[];
    initialShotId?: number;
}

export default function StoryboardSlideshowModal({ isOpen, onClose, shots, initialShotId }: StoryboardSlideshowModalProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [progress, setProgress] = useState(0);
    
    // Auto-advance duration in ms
    const duration = 4000;
    
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const progressRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(Date.now());

    useEffect(() => {
        if (isOpen && shots.length > 0) {
            if (initialShotId) {
                const index = shots.findIndex(s => s.id === initialShotId);
                if (index !== -1) {
                    setCurrentIndex(index);
                }
            } else {
                setCurrentIndex(0);
            }
            setIsPlaying(true);
            setProgress(0);
        }
    }, [isOpen, shots, initialShotId]);

    // Cleanup timers
    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (progressRef.current) clearInterval(progressRef.current);
        };
    }, []);

    useEffect(() => {
        if (!isOpen || shots.length === 0) return;

        if (isPlaying) {
            startTimeRef.current = Date.now() - (progress / 100) * duration;
            
            // Progress bar animation
            progressRef.current = setInterval(() => {
                const elapsed = Date.now() - startTimeRef.current;
                const newProgress = Math.min((elapsed / duration) * 100, 100);
                setProgress(newProgress);
            }, 50);

            // Auto-advance
            timerRef.current = setTimeout(() => {
                handleNext();
            }, duration - ((progress / 100) * duration));
            
        } else {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (progressRef.current) clearInterval(progressRef.current);
        }

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (progressRef.current) clearInterval(progressRef.current);
        };
    }, [isPlaying, currentIndex, isOpen, shots]);

    const handleNext = () => {
        setProgress(0);
        startTimeRef.current = Date.now();
        if (currentIndex < shots.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // End of slideshow, close or loop? Let's stop
            setIsPlaying(false);
            setProgress(100);
        }
    };

    const handlePrev = () => {
        setProgress(0);
        startTimeRef.current = Date.now();
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            if (!isPlaying) setIsPlaying(true); // Auto-play again if moving back
        }
    };

    const togglePlayPause = () => {
        if (!isPlaying && currentIndex === shots.length - 1) {
            // Restart from beginning if at the end
            setCurrentIndex(0);
            setProgress(0);
        }
        setIsPlaying(!isPlaying);
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === ' ') {
                e.preventDefault();
                togglePlayPause();
            }
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, currentIndex, isPlaying]);

    if (!isOpen || shots.length === 0) return null;

    const currentShot = shots[currentIndex];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex flex-col bg-black overflow-hidden"
            >
                {/* Header / Controls overlay */}
                <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-10 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-white">
                        <span className="bg-white/20 backdrop-blur px-3 py-1.5 rounded-full text-sm font-medium">
                            {currentIndex + 1} / {shots.length}
                        </span>
                        <h2 className="text-lg font-bold drop-shadow-md truncate max-w-md">
                            Scene {currentShot.scene} • Shot {currentShot.order}
                        </h2>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button
                            onClick={togglePlayPause}
                            className="bg-white/20 hover:bg-white/30 backdrop-blur text-white p-2.5 rounded-full transition-colors focus:outline-none"
                            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
                        >
                            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                        </button>
                        <button
                            onClick={onClose}
                            className="bg-black/50 hover:bg-red-500/80 text-white p-2.5 rounded-full transition-colors focus:outline-none ml-4"
                            title="Close (Esc)"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="absolute top-0 inset-x-0 h-1 bg-white/20 z-20">
                    <motion.div 
                        className="h-full bg-indigo-500"
                        style={{ width: `${progress}%` }}
                        transition={{ ease: "linear" }}
                    />
                </div>

                {/* Main Content */}
                <div className="flex-1 flex items-center justify-center relative w-full h-full group">
                    {/* Navigation Overlays */}
                    <div className="absolute inset-y-0 left-0 w-1/4 flex items-center justify-start p-6 z-10">
                        <button 
                            onClick={handlePrev}
                            disabled={currentIndex === 0}
                            className="p-4 bg-black/40 hover:bg-black/80 rounded-full text-white backdrop-blur transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0 transform hover:-translate-x-1"
                        >
                            <ChevronLeft className="w-8 h-8" />
                        </button>
                    </div>

                    <div className="absolute inset-y-0 right-0 w-1/4 flex items-center justify-end p-6 z-10">
                        <button 
                            onClick={handleNext}
                            disabled={currentIndex === shots.length - 1}
                            className="p-4 bg-black/40 hover:bg-black/80 rounded-full text-white backdrop-blur transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0 transform hover:translate-x-1"
                        >
                            <ChevronRight className="w-8 h-8" />
                        </button>
                    </div>

                    {/* Image Container */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentShot.id}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="w-full h-full flex flex-col items-center justify-center p-8 pb-32"
                        >
                            {currentShot.image_url ? (
                                <img 
                                    src={currentShot.image_url} 
                                    alt={`Shot ${currentShot.order}`} 
                                    className="max-w-full max-h-full object-contain rounded-xl shadow-2xl ring-1 ring-white/10"
                                />
                            ) : (
                                <div className="w-full max-w-4xl aspect-video bg-gray-900 border border-gray-800 rounded-2xl flex flex-col items-center justify-center text-gray-500 shadow-2xl">
                                    <ImageIcon className="w-20 h-20 opacity-20 mb-4" />
                                    <p className="text-xl">No Image Generated Yet</p>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Bottom Info Overlay */}
                    <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black via-black/80 to-transparent z-10 flex flex-col items-center justify-end">
                        <div className="max-w-4xl w-full text-center">
                            <h3 className="text-2xl font-bold text-white mb-3 drop-shadow-md">
                                {currentShot.type}
                            </h3>
                            <p className="text-lg text-gray-300 drop-shadow max-w-3xl mx-auto line-clamp-3">
                                {currentShot.description}
                            </p>
                            
                            <div className="flex justify-center flex-wrap gap-4 mt-6 text-sm">
                                {currentShot.camera_angle && (
                                    <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-md border border-gray-700">
                                        Angle: {currentShot.camera_angle}
                                    </span>
                                )}
                                {currentShot.movement && (
                                    <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-md border border-gray-700">
                                        Move: {currentShot.movement}
                                    </span>
                                )}
                                {currentShot.lighting && (
                                    <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-md border border-gray-700">
                                        Light: {currentShot.lighting}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
