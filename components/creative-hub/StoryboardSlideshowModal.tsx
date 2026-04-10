"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Shot } from "@/types/creative-hub";
import { X, Play, Pause, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StoryboardSlideshowModalProps {
    isOpen: boolean;
    onClose: () => void;
    shots: Shot[];
    initialShotId?: number;
}

const DURATION = 4000; // ms per slide

export default function StoryboardSlideshowModal({ isOpen, onClose, shots, initialShotId }: StoryboardSlideshowModalProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [progress, setProgress] = useState(0);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const progressRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(Date.now());

    const clearTimers = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (progressRef.current) clearInterval(progressRef.current);
    }, []);

    const handleNext = useCallback(() => {
        setProgress(0);
        startTimeRef.current = Date.now();
        setCurrentIndex(prev => {
            if (prev < shots.length - 1) return prev + 1;
            setIsPlaying(false);
            return prev;
        });
    }, [shots.length]);

    const handlePrev = useCallback(() => {
        setProgress(0);
        startTimeRef.current = Date.now();
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : prev));
        setIsPlaying(true);
    }, []);

    const togglePlayPause = useCallback(() => {
        setIsPlaying(prev => {
            if (!prev) {
                // restart from beginning if finished
                setCurrentIndex(ci => {
                    if (ci === shots.length - 1) { setProgress(0); return 0; }
                    return ci;
                });
                setProgress(0);
            }
            return !prev;
        });
    }, [shots.length]);

    // Initialise on open
    useEffect(() => {
        if (!isOpen || shots.length === 0) return;
        const index = initialShotId ? Math.max(0, shots.findIndex(s => s.id === initialShotId)) : 0;
        setCurrentIndex(index);
        setIsPlaying(true);
        setProgress(0);
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-advance + progress bar
    useEffect(() => {
        if (!isOpen || shots.length === 0) return;
        clearTimers();

        if (isPlaying) {
            startTimeRef.current = Date.now() - (progress / 100) * DURATION;

            progressRef.current = setInterval(() => {
                const elapsed = Date.now() - startTimeRef.current;
                setProgress(Math.min((elapsed / DURATION) * 100, 100));
            }, 50);

            const remaining = DURATION - (progress / 100) * DURATION;
            timerRef.current = setTimeout(handleNext, remaining);
        }

        return clearTimers;
    }, [isPlaying, currentIndex, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    // Cleanup on unmount
    useEffect(() => clearTimers, [clearTimers]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") handleNext();
            else if (e.key === "ArrowLeft") handlePrev();
            else if (e.key === " ") { e.preventDefault(); togglePlayPause(); }
            else if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen, handleNext, handlePrev, togglePlayPause, onClose]);

    if (!isOpen || shots.length === 0) return null;

    const currentShot = shots[currentIndex];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex flex-col bg-[var(--background)] overflow-hidden"
            >
                {/* Progress bar */}
                <div className="absolute top-0 inset-x-0 h-1 bg-[var(--border)] z-20">
                    <div
                        className="h-full bg-emerald-500 transition-none"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Header */}
                <div className="relative z-10 flex items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
                    <div className="flex items-center gap-3">
                        <span className="bg-[var(--surface-raised)] border border-[var(--border)] px-3 py-1 rounded-full text-sm font-medium text-[var(--text-primary)]">
                            {currentIndex + 1} / {shots.length}
                        </span>
                        <h2 className="text-base font-bold text-[var(--text-primary)] truncate max-w-sm">
                            Scene {currentShot.scene} · Shot {currentShot.order}
                        </h2>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrev}
                            disabled={currentIndex === 0}
                            className="p-2 rounded-md bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Previous (←)"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={togglePlayPause}
                            className="p-2 rounded-md bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] transition-colors"
                            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
                        >
                            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={currentIndex === shots.length - 1}
                            className="p-2 rounded-md bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Next (→)"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-md bg-[var(--surface-raised)] hover:bg-red-500/20 border border-[var(--border)] text-[var(--text-primary)] hover:text-red-500 transition-colors ml-2"
                            title="Close (Esc)"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Main image area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentShot.id}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="flex-1 flex items-center justify-center p-6 bg-[var(--surface-raised)]"
                        >
                            {currentShot.image_url ? (
                                <img
                                    src={currentShot.image_url}
                                    alt={`Shot ${currentShot.order}`}
                                    className="max-w-full max-h-full object-contain rounded-md shadow-lg"
                                />
                            ) : (
                                <div className="w-full max-w-4xl aspect-video bg-[var(--surface)] border border-[var(--border)] rounded-md flex flex-col items-center justify-center text-[var(--text-muted)]">
                                    <ImageIcon className="w-16 h-16 opacity-20 mb-3" />
                                    <p className="text-base">No Image Generated Yet</p>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Bottom info bar */}
                    <div className="border-t border-[var(--border)] bg-[var(--surface)] px-6 py-4">
                        <div className="max-w-4xl mx-auto text-center">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">
                                {currentShot.type}
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)] max-w-3xl mx-auto line-clamp-2">
                                {currentShot.description}
                            </p>
                            {(currentShot.camera_angle || currentShot.movement || currentShot.lighting) && (
                                <div className="flex justify-center flex-wrap gap-2 mt-3 text-xs">
                                    {currentShot.camera_angle && (
                                        <span className="bg-[var(--surface-raised)] text-[var(--text-secondary)] px-2.5 py-1 rounded border border-[var(--border)]">
                                            Angle: {currentShot.camera_angle}
                                        </span>
                                    )}
                                    {currentShot.movement && (
                                        <span className="bg-[var(--surface-raised)] text-[var(--text-secondary)] px-2.5 py-1 rounded border border-[var(--border)]">
                                            Move: {currentShot.movement}
                                        </span>
                                    )}
                                    {currentShot.lighting && (
                                        <span className="bg-[var(--surface-raised)] text-[var(--text-secondary)] px-2.5 py-1 rounded border border-[var(--border)]">
                                            Light: {currentShot.lighting}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
