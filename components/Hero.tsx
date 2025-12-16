import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { UPCOMING_GIG } from '../constants';

const Hero: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });

  const textY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const holeScale = useTransform(scrollYProgress, [0, 1], [1, 1.5]);

  // Content State: 'info' or 'lost'
  const [content, setContent] = useState<'info' | 'lost'>('info');

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let isMounted = true;

    const runLoop = () => {
      // Phase 1: Show Info (Stable)
      setContent('info');
      
      // Wait 4 seconds, then switch to Lost
      timer = setTimeout(() => {
        if (!isMounted) return;
        
        setContent('lost');
        
        // Wait 3 seconds, then switch back to Info
        timer = setTimeout(() => {
           if (!isMounted) return;
           runLoop();
        }, 2000);
        
      }, 500);
    };

    runLoop();

    return () => {
        isMounted = false;
        clearTimeout(timer);
    };
  }, []);

  // Shared Content Components
  const GigInfoContent = () => (
    <div className="flex flex-col items-center space-y-3">
        <p className="text-3xl md:text-5xl tracking-[0.2em] uppercase font-light whitespace-nowrap">
            {UPCOMING_GIG.date}
        </p>
        <div className="flex items-center justify-center gap-4 text-lg md:text-2xl font-light tracking-widest whitespace-nowrap">
            <span>{UPCOMING_GIG.location}</span>
            <span className="text-[10px] opacity-50">///</span>
            <span>{UPCOMING_GIG.venue}</span>
        </div>
    </div>
  );

  const SignalLostContent = () => (
    <div className="flex flex-col items-center justify-center py-2">
       <h2 className="text-4xl md:text-6xl font-mono text-white tracking-widest uppercase">
           演出取消
       </h2>
       <div className="mt-4 flex flex-col items-center">
         <span className="font-mono text-[10px] md:text-xs text-white/70 tracking-[0.5em] uppercase">
             SIGNAL LOST
         </span>
       </div>
    </div>
  );

  // CRT TV Turn-Off/On Variants (Vertical Collapse)
  const tvVariants = {
    initial: { 
      scaleY: 0.005, 
      scaleX: 1.1, // Start slightly wider
      opacity: 0,
      filter: "brightness(3) blur(2px)"
    },
    animate: { 
      scaleY: 1, 
      scaleX: 1,
      opacity: 1,
      filter: "brightness(1) blur(0px)",
      transition: { 
        duration: 0,
        ease: "circOut" 
      }
    },
    exit: { 
      scaleY: 0.005, 
      scaleX: 1.1, // Expand slightly width-wise as it crushes vertically
      opacity: 0,
      filter: "brightness(5) blur(2px)",
      transition: { 
        duration: 0,
        ease: "circIn" 
      }
    }
  };

  return (
    <section ref={ref} className="min-h-screen flex flex-col justify-center items-center px-6 relative overflow-hidden perspective-1000 py-20">
      
      {/* The Black Hole / Singularity Visual */}
      
      {/* Outer Glow / Accretion Disk */}
      <motion.div 
        style={{ scale: holeScale, x: "-50%", y: "-50%" }}
        animate={{ rotate: -360 }}
        transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
        className="absolute top-[55%] left-1/2 w-[90vmin] h-[90vmin] rounded-full border border-white/5 opacity-40 pointer-events-none -z-10"
      />
      
      {/* Inner Glow / Accretion Disk */}
      <motion.div 
        style={{ scale: holeScale, x: "-50%", y: "-50%" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        className="absolute top-[55%] left-1/2 w-[70vmin] h-[70vmin] rounded-full border border-white/10 opacity-60 pointer-events-none -z-10"
      />
      
      {/* Event Horizon (Pure Black) */}
      <motion.div 
        style={{ scale: holeScale, x: "-50%", y: "-50%" }}
        className="absolute top-[55%] left-1/2 w-[50vmin] h-[50vmin] bg-black rounded-full shadow-[0_0_100px_rgba(255,255,255,0.25)] z-0 pointer-events-none" 
      />

      <motion.div 
        style={{ y: textY, opacity }}
        className="flex flex-col items-center z-10 space-y-8 md:space-y-16 mix-blend-difference"
      >
        {/* Band Name */}
        <motion.h1 
          initial={{ opacity: 0, scale: 0.9, letterSpacing: "0em" }}
          animate={{ opacity: 1, scale: 1, letterSpacing: "-0.05em" }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="text-[12vw] leading-none font-light text-white select-none mix-blend-difference"
        >
          COLLAPSAR
        </motion.h1>

        {/* Divider */}
        <motion.div 
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="w-px bg-white/50 h-16 md:h-32 origin-top"
        />

        {/* Upcoming Gig Info - TV Switch Effect */}
        <div className="relative h-40 md:h-48 flex items-center justify-center w-full max-w-4xl perspective-500">
             <AnimatePresence mode="wait">
                {content === 'info' ? (
                   <motion.div
                     key="gig-info"
                     variants={tvVariants}
                     initial="initial"
                     animate="animate"
                     exit="exit"
                     className="absolute inset-0 flex items-center justify-center origin-center"
                   >
                     <GigInfoContent />
                   </motion.div>
                ) : (
                   <motion.div
                     key="signal-lost"
                     variants={tvVariants}
                     initial="initial"
                     animate="animate"
                     exit="exit"
                     className="absolute inset-0 flex items-center justify-center origin-center"
                   >
                     <SignalLostContent />
                   </motion.div>
                )}
            </AnimatePresence>
        </div>

      </motion.div>
      
      {/* Scroll indicator */}
      <motion.div 
        animate={{ y: [0, 10, 0], opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-10 text-white/30 text-xs tracking-[0.5em] uppercase hidden md:block"
      >
        Scroll to Observe
      </motion.div>
    </section>
  );
};

export default Hero;
