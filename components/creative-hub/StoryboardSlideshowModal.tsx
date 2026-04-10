"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Shot } from "@/types/creative-hub";
import { X, Play, Pause, ChevronLeft, ChevronRight, Image as ImageIcon, Maximize2, Minimize2, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StoryboardSlideshowModalProps {
    isOpen: boolean;
    onClose: () => void;
    shots: Shot[];
    initialShotId?: number;
}

const DURATION = 4000;

export default function StoryboardSlideshowModal({ isOpen, onClose, shots, initialShotId }: StoryboardSlideshowModalProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [progress, setProgress] = useState(0);
    const [showInfo, setShowInfo] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const progressRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(Date.now());
    const containerRef = useRef<HTMLDivElement>(null);

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
                setCurrentIndex(ci => {
                    if (ci === shots.length - 1) { setProgress(0); return 0; }
                    return ci;
                });
                setProgress(0);
            }
            return !prev;
        });
    }, [shots.length]);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(() => {});
            setIsFullscreen(true);
        } else {
            document.exitFullscreen().catch(() => {});
            setIsFullscreen(false);
        }
    }, []);

    // Sync isFullscreen with browser fullscreen changes (e.g. user presses Esc)
    useEffect(() => {
        const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", onFsChange);
        return () => document.removeEventListener("fullscreenchange", onFsChange);
    }, []);

    // Initialise on open
    useEffect(() => {
        if (!isOpen || shots.length === 0) return;
        const index = initialShotId ? Math.max(0, shots.findIndex(s => s.id === initialShotId)) : 0;
        setCurrentIndex(index);
        setIsPlaying(true);
        setProgress(0);
        setShowInfo(true);
        setIsFullscreen(false);
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

    useEffect(() => clearTimers, [clearTimers]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") handleNext();
            else if (e.key === "ArrowLeft") handlePrev();
            else if (e.key === " ") { e.preventDefault(); togglePlayPause(); }
            else if (e.key === "Escape" && !document.fullscreenElement) onClose();
            else if (e.key === "f" || e.key === "F") toggleFullscreen();
            else if (e.key === "i" || e.key === "I") setShowInfo(p => !p);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen, handleNext, handlePrev, togglePlayPause, onClose, toggleFullscreen]);

    if (!isOpen || shots.length === 0) return null;

    const currentShot = shots[currentIndex];
    const hasMetadata = currentShot.camera_angle || currentShot.movement || currentShot.lighting;

    return (
        <AnimatePresence>
            <motion.div
                ref={containerRef}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex flex-col bg-[var(--background)] overflow-hidden"
            >
                {/* Progress bar — always on top */}
                <div className="absolute top-0 inset-x-0 h-1 bg-[var(--border)] z-30">
                    <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${progress}%`, transition: "none" }}
                    />
                </div>

                {/* ── Header controls ── */}
                {!isFullscreen && (
                    <div className="relative z-20 flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[var(--surface)] flex-shrink-0">
                        {/* Left: counter + title */}
                        <div className="flex items-center gap-3 min-w-0">
                            <span className="bg-[var(--surface-raised)] border border-[var(--border)] px-2.5 py-0.5 rounded-full text-xs font-medium text-[var(--text-primary)] flex-shrink-0">
                                {currentIndex + 1} / {shots.length}
                            </span>
                            <h2 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                                Scene {currentShot.scene} · Shot {currentShot.order} · {currentShot.type}
                            </h2>
                        </div>

                        {/* Right: controls */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button onClick={handlePrev} disabled={currentIndex === 0}
                                title="Previous (←)"
                                className="p-1.5 rounded-md bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button onClick={togglePlayPause}
                                title={isPlaying ? "Pause (Space)" : "Play (Space)"}
                                className="p-1.5 rounded-md bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] transition-colors">
                                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>
                            <button onClick={handleNext} disabled={currentIndex === shots.length - 1}
                                title="Next (→)"
                                className="p-1.5 rounded-md bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                <ChevronRight className="w-4 h-4" />
                            </button>

                            <div className="w-px h-5 bg-[var(--border)] mx-1" />

                            <button onClick={() => setShowInfo(p => !p)}
                                title="Toggle info (I)"
                                className={`p-1.5 rounded-md border transition-colors ${showInfo ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : "bg-[var(--surface-raised)] border-[var(--border)] text-[var(--text-muted)]"}`}>
                                <Info className="w-4 h-4" />
                            </button>
                            <button onClick={toggleFullscreen}
                                title="Fullscreen image (F)"
                                className="p-1.5 rounded-md bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] transition-colors">
                                <Maximize2 className="w-4 h-4" />
                            </button>
                            <button onClick={onClose}
                                title="Close (Esc)"
                                className="p-1.5 rounded-md bg-[var(--surface-raised)] hover:bg-red-500/20 border border-[var(--border)] text-[var(--text-primary)] hover:text-red-500 transition-colors ml-1">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Body: image + optional info panel ── */}
                <div className="flex-1 flex flex-col min-h-0">

                    {/* Image area — takes all remaining space */}
                    <div className="flex-1 relative min-h-0 bg-[var(--surface-raised)]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentShot.id}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="absolute inset-0 flex items-center justify-center p-4"
                            >
                                {currentShot.image_url ? (
                                    <img
                                        src={currentShot.image_url}
                                        alt={`Shot ${currentShot.order}`}
                                        className="max-w-full max-h-full object-contain rounded-md shadow-md"
                                        style={{ display: "block" }}
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
                                        <ImageIcon className="w-16 h-16 opacity-20" />
                                        <p className="text-sm">No image generated yet</p>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>

                        {/* Fullscreen exit button — only shown when in fullscreen */}
                        {isFullscreen && (
                            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                                <button onClick={handlePrev} disabled={currentIndex === 0}
                                    className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white disabled:opacity-30 transition-colors backdrop-blur-sm">
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button onClick={togglePlayPause}
                                    className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors backdrop-blur-sm">
                                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                                </button>
                                <button onClick={handleNext} disabled={currentIndex === shots.length - 1}
                                    className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white disabled:opacity-30 transition-colors backdrop-blur-sm">
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                                <button onClick={toggleFullscreen}
                                    className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors backdrop-blur-sm">
                                    <Minimize2 className="w-5 h-5" />
                                </button>
                            </div>
                        )}

                        {/* Fullscreen shot counter */}
                        {isFullscreen && (
                            <div className="absolute top-4 left-4 z-10">
                                <span className="bg-black/50 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full">
                                    {currentIndex + 1} / {shots.length}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* ── Info panel (toggleable, never shown in fullscreen) ── */}
                    <AnimatePresence>
                        {showInfo && !isFullscreen && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden flex-shrink-0 border-t border-[var(--border)] bg-[var(--surface)]"
                            >
                                <div className="px-6 py-4 max-w-4xl mx-auto text-center">
                                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-3">
                                        {currentShot.description || <span className="italic text-[var(--text-muted)]">No description.</span>}
                                    </p>
                                    {hasMetadata && (
                                        <div className="flex justify-center flex-wrap gap-2 mt-3">
                                            {currentShot.camera_angle && (
                                                <span className="bg-[var(--surface-raised)] text-[var(--text-secondary)] text-xs px-2.5 py-1 rounded border border-[var(--border)]">
                                                    Angle: {currentShot.camera_angle}
                                                </span>
                                            )}
                                            {currentShot.movement && (
                                                <span className="bg-[var(--surface-raised)] text-[var(--text-secondary)] text-xs px-2.5 py-1 rounded border border-[var(--border)]">
                                                    Move: {currentShot.movement}
                                                </span>
                                            )}
                                            {currentShot.lighting && (
                                                <span className="bg-[var(--surface-raised)] text-[var(--text-secondary)] text-xs px-2.5 py-1 rounded border border-[var(--border)]">
                                                    Light: {currentShot.lighting}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
