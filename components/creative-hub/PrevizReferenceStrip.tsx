'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageIcon, X } from 'lucide-react';
import { ReferenceImage } from '@/types/creative-hub';

const TYPE_BADGE: Record<string, string> = {
  character: 'bg-emerald-600/80 text-emerald-100',
  scene_character: 'bg-purple-600/80 text-purple-100',
  location: 'bg-amber-600/80 text-amber-100',
};

function badgeClass(type: string): string {
  return TYPE_BADGE[type] ?? 'bg-neutral-600/80 text-neutral-100';
}

interface Props {
  images: ReferenceImage[];
  size?: 'sm' | 'md';
  className?: string;
}

export default function PrevizReferenceStrip({ images, size = 'sm', className = '' }: Props) {
  const [errored, setErrored] = useState<Set<number>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const px = size === 'md' ? 56 : 40;

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeLightbox(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightboxIndex, closeLightbox]);

  if (images.length === 0) return null;

  const activeLightboxImage = lightboxIndex !== null ? images[lightboxIndex] : null;

  return (
    <>
      <div className={`flex gap-1.5 overflow-x-auto ${className}`} style={{ scrollbarWidth: 'none' }}>
        {images.map((img, idx) => {
          const hasError = errored.has(img.id);
          return (
            <div
              key={img.id}
              className="relative flex-shrink-0 rounded-sm overflow-hidden bg-[var(--surface-raised)] border border-[var(--border)] cursor-pointer"
              style={{ width: px, height: px }}
              onClick={() => { if (!hasError) setLightboxIndex(idx); }}
              title={img.type}
            >
              {hasError ? (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="text-[var(--text-muted)]" style={{ width: px * 0.45, height: px * 0.45 }} />
                </div>
              ) : (
                <img
                  src={img.image_url}
                  alt={img.type}
                  loading="lazy"
                  className="w-full h-full object-cover"
                  onError={() => setErrored((prev) => new Set(prev).add(img.id))}
                />
              )}
              <span
                className={`absolute bottom-0 left-0 right-0 text-center leading-none px-0.5 py-px truncate ${badgeClass(img.type)}`}
                style={{ fontSize: 7 }}
              >
                {img.type.replace('_', ' ')}
              </span>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {activeLightboxImage && (
          <motion.div
            key="lb-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
            onClick={closeLightbox}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="flex flex-col items-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={activeLightboxImage.image_url}
                alt={activeLightboxImage.type}
                className="max-h-[80vh] max-w-[80vw] object-contain rounded"
              />
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${badgeClass(activeLightboxImage.type)}`}>
                {activeLightboxImage.type.replace('_', ' ')}
              </span>
            </motion.div>
            <button
              className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/80 rounded-md text-white"
              onClick={closeLightbox}
            >
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
