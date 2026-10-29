import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export interface LightboxImage {
  url: string;
  caption?: string;
  alt?: string;
}

interface BlogLightboxProps {
  images: LightboxImage[];
  currentIndex: number | null;
  onClose: () => void;
  onNavigate?: (newIndex: number) => void;
}

export const BlogLightbox: React.FC<BlogLightboxProps> = ({
  images,
  currentIndex,
  onClose,
  onNavigate,
}) => {
  useEffect(() => {
    if (currentIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && onNavigate && images.length > 1) {
        onNavigate((currentIndex - 1 + images.length) % images.length);
      } else if (e.key === 'ArrowRight' && onNavigate && images.length > 1) {
        onNavigate((currentIndex + 1) % images.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, images.length, onClose, onNavigate]);

  if (currentIndex === null || !images[currentIndex]) return null;

  const current = images[currentIndex];
  const hasMultiple = images.length > 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[300] flex flex-col justify-between bg-black/95 p-4 text-white backdrop-blur-xl animate-fade-in select-none md:p-8"
      onClick={onClose}
    >
      {/* 顶部状态与关闭行 */}
      <div
        className="mx-auto flex w-full max-w-6xl items-center justify-between border-b border-white/15 pb-4 font-mono text-xs tracking-widest text-white/60"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="flex items-center space-x-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>OPTICAL_PREVIEW // {String(currentIndex + 1).padStart(2, '0')} OF {String(images.length).padStart(2, '0')}</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center space-x-1.5 rounded border border-white/20 bg-white/5 px-3 py-1.5 text-white/80 transition-all hover:border-white hover:bg-white/10 hover:text-white"
          aria-label="Close image preview"
        >
          <span className="text-[11px] font-mono">ESC</span>
          <X size={16} />
        </button>
      </div>

      {/* 图片主视图 */}
      <div
        className="relative mx-auto flex min-h-0 w-full max-w-6xl flex-1 items-center justify-between py-4"
        onClick={(e) => e.stopPropagation()}
      >
        {hasMultiple && onNavigate ? (
          <button
            type="button"
            onClick={() => onNavigate((currentIndex - 1 + images.length) % images.length)}
            className="z-10 rounded-full border border-white/20 bg-black/60 p-3 text-white/70 backdrop-blur transition hover:border-white hover:text-white"
            aria-label="Previous image"
          >
            <ChevronLeft size={24} />
          </button>
        ) : <div className="w-10" />}

        <div className="flex h-full w-full items-center justify-center overflow-hidden p-2">
          <img
            src={current.url}
            alt={current.alt || current.caption || 'Preview image'}
            className="max-h-[80vh] max-w-full rounded-sm object-contain shadow-[0_0_50px_rgba(255,255,255,0.08)]"
          />
        </div>

        {hasMultiple && onNavigate ? (
          <button
            type="button"
            onClick={() => onNavigate((currentIndex + 1) % images.length)}
            className="z-10 rounded-full border border-white/20 bg-black/60 p-3 text-white/70 backdrop-blur transition hover:border-white hover:text-white"
            aria-label="Next image"
          >
            <ChevronRight size={24} />
          </button>
        ) : <div className="w-10" />}
      </div>

      {/* 底部描述行 */}
      <div
        className="mx-auto w-full max-w-4xl border-t border-white/15 pt-3 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {current.caption && (
          <p className="font-serif text-sm text-white/85 tracking-wide md:text-base">
            {current.caption}
          </p>
        )}
        <p className="mt-1 font-mono text-[10px] text-white/40 tracking-widest uppercase">
          CLICK ANYWHERE OUTSIDE OR PRESS ESC TO EXIT
        </p>
      </div>
    </div>
  );
};

export default BlogLightbox;
