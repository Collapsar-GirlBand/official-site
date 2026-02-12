import { SpeedInsights } from "@vercel/speed-insights/react"
import React, { useEffect, useState, useRef } from 'react';
import Background from './components/Background';
import Hero from './components/Hero';
import Contact from './components/Contact';
import GameSystem from './components/GameSystem';
import { AnimatePresence } from 'framer-motion';

function App() {
  const [isGameOpen, setIsGameOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Lock scroll initially for enter animation or browser quirks
    document.body.style.overflow = 'hidden';
    
    // 2. Unlock body overflow (but we keep overflow hidden on body via class and scroll inside div)
    const timer = setTimeout(() => {
        // We keep document.body.style.overflow = 'hidden' via CSS classes in main container essentially,
        // but explicit style removal allows our internal div to handle scrolling.
        // Actually, for snap scroll on a div to work perfectly fullscreen, body should not scroll.
        // So we might just leave it locked or set to hidden in CSS.
        // The index.html has styles, but here we enforce structure.
    }, 1000);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <main className="h-screen w-screen overflow-hidden bg-black text-white relative">
      <Background scrollContainerRef={containerRef} />
      
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
      
      <SpeedInsights />
    </main>
  );
}

export default App;
