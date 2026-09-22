import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { GALLERY_ITEMS, galleryImageUrl } from '../content/gallery';
import { useLanguage } from '../content/language';

const GalleryView: React.FC = () => {
  const { language, UI_TEXT } = useLanguage();
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (selected === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null);
      if (event.key === 'ArrowLeft') setSelected(index => index === null ? null : (index - 1 + GALLERY_ITEMS.length) % GALLERY_ITEMS.length);
      if (event.key === 'ArrowRight') setSelected(index => index === null ? null : (index + 1) % GALLERY_ITEMS.length);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selected]);

  const item = selected === null ? null : GALLERY_ITEMS[selected];

  return (
    <div className="absolute inset-0 overflow-y-auto bg-[#050505] text-white select-text">
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-12">
        <div className="mb-8 border-b border-white/15 pb-6 md:mb-10">
          <p className="mb-3 font-mono text-[10px] tracking-[0.3em] text-white/40">{UI_TEXT.GAME.GALLERY_SUBTITLE}</p>
          <h2 className="text-2xl font-light tracking-[0.2em] md:text-4xl">{UI_TEXT.GAME.GALLERY_TITLE}</h2>
          <p className="mt-3 font-mono text-xs text-white/40">{GALLERY_ITEMS.length.toString().padStart(2, '0')} {language === 'zh' ? '幅作品' : 'WORKS'}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
          {GALLERY_ITEMS.map((art, index) => (
            <button
              key={art.file}
              type="button"
              onClick={() => setSelected(index)}
              className="group min-w-0 border border-white/10 bg-white/[0.03] p-2 text-left transition-colors hover:border-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white md:p-3"
              aria-label={`${language === 'zh' ? '查看' : 'View'} ${art.title[language]}`}
            >
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-white/5">
                <img src={galleryImageUrl(art.file)} alt={art.title[language]} loading="lazy" className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.03]" />
              </div>
              <div className="px-1 pb-1 pt-3">
                <span className="font-mono text-[10px] text-white/35">{String(index + 1).padStart(2, '0')} / {String(GALLERY_ITEMS.length).padStart(2, '0')}</span>
                <h3 className="mt-1 text-sm font-medium leading-snug md:text-base">{art.title[language]}</h3>
                <p className="mt-2 text-xs leading-relaxed text-white/50">{art.description[language]}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {item && selected !== null && (
        <div role="dialog" aria-modal="true" aria-label={item.title[language]} className="fixed inset-0 z-[250] flex flex-col bg-[#050505] p-4 text-white md:p-8">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 border-b border-white/15 pb-3 font-mono text-xs tracking-widest text-white/50">
            <span>{String(selected + 1).padStart(2, '0')} / {String(GALLERY_ITEMS.length).padStart(2, '0')}</span>
            <button type="button" onClick={() => setSelected(null)} aria-label={language === 'zh' ? '关闭画作' : 'Close artwork'} className="p-2 text-white/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"><X size={22} /></button>
          </div>
          <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 items-center justify-between gap-2 py-4 md:gap-6">
            <button type="button" onClick={() => setSelected((selected - 1 + GALLERY_ITEMS.length) % GALLERY_ITEMS.length)} aria-label={language === 'zh' ? '上一幅' : 'Previous artwork'} className="shrink-0 p-1 text-white/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white md:p-3"><ChevronLeft size={28} /></button>
            <img src={galleryImageUrl(item.file)} alt={item.title[language]} className="min-h-0 min-w-0 max-h-full max-w-full object-contain" />
            <button type="button" onClick={() => setSelected((selected + 1) % GALLERY_ITEMS.length)} aria-label={language === 'zh' ? '下一幅' : 'Next artwork'} className="shrink-0 p-1 text-white/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white md:p-3"><ChevronRight size={28} /></button>
          </div>
          <div className="mx-auto w-full max-w-6xl border-t border-white/15 pt-4 text-center">
            <h3 className="text-lg font-light tracking-wider md:text-2xl">{item.title[language]}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/55">{item.description[language]}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryView;
