import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Languages, Sparkles } from 'lucide-react';
import { Language, useLanguage } from '../content/language';

const choices: Array<{ value: Language; label: string; detail: string; code: string }> = [
  { value: 'zh', label: '简体中文', detail: '进入中文信号频道', code: 'ZH / CN' },
  { value: 'en', label: 'English', detail: 'Enter the English signal', code: 'EN / US' },
];

export default function LanguageGate() {
  const { setLanguage } = useLanguage();
  const reducedMotion = useReducedMotion();
  return (
    <motion.div role="dialog" aria-modal="true" aria-label="Choose your language" className="fixed inset-0 z-[300] flex items-center justify-center overflow-hidden bg-[#030304] px-5 text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reducedMotion ? 0 : 0.45 }}>
      <div aria-hidden="true" className="absolute inset-0 opacity-70 [background:radial-gradient(circle_at_50%_50%,rgba(117,87,177,.22),transparent_26rem),radial-gradient(circle_at_15%_10%,rgba(32,125,180,.2),transparent_25rem)]" />
      <motion.div aria-hidden="true" className="absolute h-[34rem] w-[34rem] rounded-full border border-white/10" animate={reducedMotion ? {} : { rotate: 360 }} transition={{ duration: 34, repeat: Infinity, ease: 'linear' }} />
      <motion.div aria-hidden="true" className="absolute h-[25rem] w-[25rem] rounded-full border border-dashed border-white/15" animate={reducedMotion ? {} : { rotate: -360 }} transition={{ duration: 25, repeat: Infinity, ease: 'linear' }} />
      <motion.div className="relative w-full max-w-3xl overflow-hidden border border-white/20 bg-black/55 p-6 shadow-[0_0_80px_rgba(147,104,225,.22)] backdrop-blur-xl sm:p-10" initial={reducedMotion ? false : { opacity: 0, y: 28, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 180, damping: 18, delay: reducedMotion ? 0 : 0.12 }}>
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-300 to-transparent" />
        <div className="flex items-center gap-3 font-mono text-[10px] tracking-[0.32em] text-white/50"><Sparkles size={13} className="text-fuchsia-200" /> INITIALIZE // 01</div>
        <div className="mt-9 flex items-start justify-between gap-4"><div><h1 className="text-3xl font-light tracking-[0.12em] sm:text-5xl">SELECT SIGNAL</h1><p className="mt-4 max-w-lg text-sm leading-relaxed text-white/55 sm:text-base">选择语言以进入 COLLAPSAR 的宇宙。<br />Choose a language to tune into COLLAPSAR.</p></div><Languages aria-hidden="true" className="mt-1 shrink-0 text-white/45" size={30} /></div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2">{choices.map((choice, index) => <motion.button key={choice.value} type="button" lang={choice.value === 'zh' ? 'zh-CN' : 'en'} onClick={() => setLanguage(choice.value)} className="group relative min-h-36 overflow-hidden border border-white/20 bg-white/[0.035] p-5 text-left transition-colors hover:border-fuchsia-200/80 hover:bg-fuchsia-200/[0.1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" initial={reducedMotion ? false : { opacity: 0, x: index === 0 ? -18 : 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: reducedMotion ? 0 : 0.28 + index * 0.1 }} whileHover={reducedMotion ? {} : { y: -4 }} whileTap={{ scale: 0.98 }}><span aria-hidden="true" className="absolute -right-5 -top-7 font-mono text-7xl font-bold text-white/[0.035] transition-transform duration-500 group-hover:scale-110">{choice.value === 'zh' ? '中' : 'A'}</span><span className="relative block font-mono text-[10px] tracking-[0.24em] text-fuchsia-100/65">{choice.code}</span><span className="relative mt-5 block text-2xl tracking-wide">{choice.label}</span><span className="relative mt-2 block text-xs text-white/50">{choice.detail}</span><span aria-hidden="true" className="absolute bottom-0 left-0 h-px w-0 bg-fuchsia-100 transition-all duration-500 group-hover:w-full" /></motion.button>)}</div>
        <p className="mt-7 text-center font-mono text-[10px] tracking-[0.18em] text-white/30">LANGUAGE CAN BE CHANGED LATER</p>
      </motion.div>
    </motion.div>
  );
}
