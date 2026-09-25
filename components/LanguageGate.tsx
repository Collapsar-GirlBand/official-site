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
        className="absolute inset-0 opacity-70 [background:radial-gradient(circle_at_50%_46%,rgba(117,87,177,.16),transparent_22rem),radial-gradient(circle_at_50%_100%,rgba(32,125,180,.09),transparent_32rem)]"
      />

      <motion.div
        className="relative flex flex-col items-center"
        initial={reducedMotion ? false : { opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reducedMotion ? undefined : { opacity: 0, scale: 1.03 }}
        transition={{ duration: reducedMotion ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          aria-hidden="true"
          className="relative flex h-24 w-24 items-center justify-center text-white/55"
          animate={reducedMotion ? undefined : { opacity: [0.48, 0.72, 0.48] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="absolute inset-0 rounded-full border border-white/[0.08] shadow-[0_0_44px_rgba(147,104,225,.12)]" />
          <Languages strokeWidth={1.7} size={48} />
        </motion.div>

        <div role="group" aria-label="选择语言 / Choose language" className="mt-9 flex items-center">
          {choices.map((choice, index) => (
            <React.Fragment key={choice.value}>
              {index > 0 && <span aria-hidden="true" className="mx-5 h-5 w-px bg-white/20 sm:mx-7" />}
              <motion.button
                type="button"
                lang={choice.value === 'zh' ? 'zh-CN' : 'en'}
                aria-label={choice.ariaLabel}
                onClick={() => setLanguage(choice.value)}
                className="group relative min-h-12 min-w-14 px-2 font-mono text-lg tracking-[0.14em] text-white/55 transition-colors duration-300 hover:text-white focus-visible:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-white/70 sm:text-xl"
                initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: reducedMotion ? 0 : 0.2 + index * 0.08 }}
                whileHover={reducedMotion ? undefined : { y: -2 }}
                whileTap={{ scale: 0.94 }}
              >
                {choice.label}
                <span aria-hidden="true" className="absolute inset-x-2 bottom-1 h-px origin-center scale-x-0 bg-white/70 transition-transform duration-300 group-hover:scale-x-100" />
              </motion.button>
            </React.Fragment>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
