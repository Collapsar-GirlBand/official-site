import React from 'react';
import { useLanguage } from '../content/language';

export default function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();
  return (
    <div role="group" aria-label={language === 'en' ? 'Language' : '语言'} className="flex shrink-0 rounded-full border border-white/30 bg-black/80 p-1 text-xs font-mono shadow-lg backdrop-blur-md">
      {(['zh', 'en'] as const).map(value => (
        <button key={value} type="button" lang={value === 'zh' ? 'zh-CN' : 'en'} aria-pressed={language === value}
          aria-label={value === 'zh' ? (language === 'en' ? 'Chinese' : '中文') : 'English'}
          onClick={() => setLanguage(value)}
          className={`min-h-9 min-w-11 rounded-full px-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${language === value ? 'bg-white text-black' : 'text-gray-300 hover:text-white'}`}>
          {value === 'zh' ? (language === 'en' ? 'ZH' : '中') : 'EN'}
        </button>
      ))}
    </div>
  );
}
