import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Languages } from 'lucide-react';
import { Language, useLanguage } from '../content/language';

const choices: Array<{ value: Language; label: string; ariaLabel: string }> = [
  { value: 'zh', label: '中', ariaLabel: '选择中文' },
  { value: 'en', label: 'EN', ariaLabel: 'Select English' },
];

export default function LanguageGate() {
  const { setLanguage } = useLanguage();
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="选择语言 / Choose language"
      className="fixed inset-0 z-[300] flex items-center justify-center overflow-hidden bg-[#030304] text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.45, ease: 'easeOut' }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 [background:radial-gradient(circle_at_50%_45%,rgba(255,255,255,.12),transparent_19rem),radial-gradient(circle_at_50%_78%,rgba(255,255,255,.04),transparent_32rem)]"
      />

      <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2">
        <motion.div
          className="h-full w-full rounded-full border border-white/[0.07]"
          animate={reducedMotion ? undefined : { scale: [0.92, 1.04, 0.92], opacity: [0.35, 0.75, 0.35] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <motion.div
        className="relative flex flex-col items-center"
        initial={reducedMotion ? false : { opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reducedMotion ? undefined : { opacity: 0, scale: 1.03 }}
        transition={{ duration: reducedMotion ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          aria-hidden="true"
          className="relative flex h-28 w-28 items-center justify-center text-white"
          animate={reducedMotion ? undefined : { y: [0, -4, 0], filter: ['drop-shadow(0 0 8px rgba(255,255,255,.2))', 'drop-shadow(0 0 18px rgba(255,255,255,.5))', 'drop-shadow(0 0 8px rgba(255,255,255,.2))'] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.div
            className="absolute inset-0 rounded-full border border-white/25 shadow-[0_0_60px_rgba(255,255,255,.16),inset_0_0_24px_rgba(255,255,255,.06)]"
            animate={reducedMotion ? undefined : { scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute inset-2 rounded-full border-t border-r border-white/60"
            animate={reducedMotion ? undefined : { rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          />
          <Languages strokeWidth={1.8} size={52} />
        </motion.div>

        <div aria-hidden="true" className="relative h-14 w-px overflow-hidden bg-white/10">
          <motion.span
            className="absolute inset-x-0 top-0 h-7 bg-gradient-to-b from-transparent via-white to-transparent shadow-[0_0_10px_white]"
            animate={reducedMotion ? undefined : { y: [-28, 56] }}
            transition={{ duration: 1.45, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div role="group" aria-label="选择语言 / Choose language" className="relative flex items-center gap-3 rounded-full border border-white/20 bg-black/35 p-2 shadow-[0_0_44px_rgba(255,255,255,.1)] backdrop-blur-md sm:gap-4">
          {choices.map((choice, index) => (
            <React.Fragment key={choice.value}>
              <motion.button
                type="button"
                lang={choice.value === 'zh' ? 'zh-CN' : 'en'}
                aria-label={choice.ariaLabel}
                onClick={() => setLanguage(choice.value)}
                className="group relative z-10 min-h-14 min-w-24 overflow-hidden rounded-full border border-white/15 bg-white/[0.055] px-6 font-mono text-lg tracking-[0.14em] text-white/75 shadow-[inset_0_0_18px_rgba(255,255,255,.03)] transition-all duration-300 hover:border-white/60 hover:bg-white/[0.16] hover:text-white hover:shadow-[0_0_24px_rgba(255,255,255,.18)] focus-visible:border-white/70 focus-visible:bg-white/[0.16] focus-visible:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white/80 sm:min-w-28 sm:text-xl"
                initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: reducedMotion ? 0 : 0.2 + index * 0.08 }}
                whileHover={reducedMotion ? undefined : { y: -3, scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
              >
                <motion.span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-full border border-white/65 shadow-[0_0_22px_rgba(255,255,255,.28)]"
                  animate={reducedMotion ? undefined : { opacity: [0, 0.8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: index * 1.5 }}
                />
                {choice.label}
                <span aria-hidden="true" className="absolute inset-x-6 bottom-2 h-px origin-center scale-x-0 bg-white shadow-[0_0_6px_white] transition-transform duration-300 group-hover:scale-x-100" />
              </motion.button>
            </React.Fragment>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
