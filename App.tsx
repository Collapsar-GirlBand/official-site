import { SpeedInsights } from "@vercel/speed-insights/react"
import React, { useState, useRef } from 'react';
import Background from './components/Background';
import Hero from './components/Hero';
import LanguageSwitch from './components/LanguageSwitch';
import LanguageGate from './components/LanguageGate';
import Contact from './components/Contact';
import GameSystem from './components/GameSystem';
import { AnimatePresence } from 'framer-motion';
import { useLanguage } from './content/language';

function App() {
  const [isGameOpen, setIsGameOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { hasSelectedLanguage } = useLanguage();

  return (
    <main className="h-screen w-screen overflow-hidden bg-black text-white relative">
      <Background scrollContainerRef={containerRef} />
      {!isGameOpen && <div className="fixed top-5 right-5 z-50"><LanguageSwitch /></div>}
      
      <div 
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth z-10 relative"
        style={{ scrollBehavior: 'smooth' }}
      >
        <section className="h-screen w-full snap-start shrink-0 relative">
          <Hero onOpenGame={() => setIsGameOpen(true)} containerRef={containerRef} />
        </section>
        
        <section className="h-screen w-full snap-start shrink-0 relative">
          <Contact />
        </section>
      </div>

      <AnimatePresence>
        {isGameOpen && (
          <GameSystem isOpen={isGameOpen} onClose={() => setIsGameOpen(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>{!hasSelectedLanguage && <LanguageGate />}</AnimatePresence>
      
      <SpeedInsights />
    </main>
  );
}

export default App;
