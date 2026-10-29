import { SpeedInsights } from "@vercel/speed-insights/react"
import React, { Suspense, lazy, useState, useRef } from 'react';
import Background from './components/Background';
import Hero from './components/Hero';
import LanguageSwitch from './components/LanguageSwitch';
import LanguageGate from './components/LanguageGate';
import Contact from './components/Contact';
import { AnimatePresence } from 'framer-motion';
import { useLanguage } from './content/language';

import BlogPage from './components/BlogPage';

const loadGameSystem = () => import('./components/GameSystem');
const GameSystem = lazy(loadGameSystem);

const getIsBlogRoute = () => {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash.toLowerCase();
  const search = window.location.search.toLowerCase();
  const path = window.location.pathname.toLowerCase();

  return (
    hash.startsWith('#/blog') ||
    hash === '#blog' ||
    search.includes('page=blog') ||
    search.includes('blog=true') ||
    path.endsWith('/blog') ||
    path.endsWith('/blog.html')
  );
};

function App() {
  const [isBlog, setIsBlog] = useState(getIsBlogRoute);
  const [isGameOpen, setIsGameOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { hasSelectedLanguage } = useLanguage();

  React.useEffect(() => {
    const handleLocationChange = () => {
      setIsBlog(getIsBlogRoute());
    };
    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const handleBackToHome = () => {
    if (window.location.hash.startsWith('#/blog') || window.location.hash === '#blog') {
      window.location.hash = '';
    } else if (window.location.search.includes('blog')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('page');
      url.searchParams.delete('blog');
      window.history.pushState({}, '', url.toString());
    } else {
      const basePath = window.location.pathname.replace(/\/blog(\.html)?$/, '/') || '/';
      window.history.pushState({}, '', basePath);
    }
    setIsBlog(false);
  };

  if (isBlog) {
    return (
      <>
        <BlogPage onBackToHome={handleBackToHome} />
        <SpeedInsights />
      </>
    );
  }

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
          <Hero
            onOpenGame={() => setIsGameOpen(true)}
            onPreloadGame={() => { void loadGameSystem(); }}
            containerRef={containerRef}
          />
        </section>
        
        <section className="h-screen w-full snap-start shrink-0 relative">
          <Contact />
        </section>
      </div>

      <Suspense fallback={<div className="fixed inset-0 z-[100] bg-black" aria-label="Loading" />}>
        <AnimatePresence>
          {isGameOpen && (
            <GameSystem isOpen={isGameOpen} onClose={() => setIsGameOpen(false)} />
          )}
        </AnimatePresence>
      </Suspense>
      <AnimatePresence>{!hasSelectedLanguage && <LanguageGate />}</AnimatePresence>
      
      <SpeedInsights />
    </main>
  );
}

export default App;
