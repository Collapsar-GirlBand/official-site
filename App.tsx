import React, { useEffect } from 'react';
import Background from './components/Background';
import Hero from './components/Hero';
import Timeline from './components/Timeline';
import Contact from './components/Contact';

function App() {
  useEffect(() => {
    // 1. Lock scroll immediately upon mounting
    // We modify the body style directly to prevent any user interaction
    document.body.style.overflow = 'hidden';
    
    // 2. Set a timer for 1 second (1000ms)
    const timer = setTimeout(() => {
      // 3. Unlock scroll by removing the inline style
      // This reverts to the CSS defined in index.html (overflow-x: hidden)
      document.body.style.overflow = '';
    }, 1000);

    // Cleanup function: ensures we don't leave the scroll locked 
    // if the component unmounts unexpectedly before the timer fires
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = '';
    };
  }, []); // Empty dependency array ensures this runs only once on page load

  return (
    <main className="min-h-screen relative text-white">
      <Background />
      <div className="relative z-10">
        <Hero />
        <Timeline />
        <Contact />
      </div>
    </main>
  );
}

export default App;