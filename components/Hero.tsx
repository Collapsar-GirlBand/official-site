import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, Variants } from 'framer-motion';
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

  // State: Interference Active (true) or Stable (false)
  const [isInterference, setIsInterference] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let isMounted = true;

    const runLoop = () => {
      // 1. Stable State (Show Gig Info) - Duration: 3.5s
      setIsInterference(false);
      
      timer = setTimeout(() => {
        if (!isMounted) return;
        
        // 2. Interference State (Show Signal Lost) - Duration: 1.5s
        setIsInterference(true);
        
        timer = setTimeout(() => {
           if (!isMounted) return;
           runLoop();
        }, 1500);
        
      }, 3500);
    };

    runLoop();

    return () => {
        isMounted = false;
        clearTimeout(timer);
    };
  }, []);

  // Visual Components
  const GigInfoContent = () => (
    <div className="flex flex-col items-center space-y-3">
        <p className="text-3xl md:text-5xl tracking-[0.2em] uppercase font-light whitespace-nowrap text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
            {UPCOMING_GIG.date}
        </p>
        <div className="flex items-center justify-center gap-4 text-lg md:text-2xl font-light tracking-widest whitespace-nowrap text-white/80">
            <span>{UPCOMING_GIG.location}</span>
            <span className="text-[10px] opacity-50">///</span>
            <span>{UPCOMING_GIG.venue}</span>
        </div>
    </div>
  );

  const SignalLostContent = () => (
    <div className="flex flex-col items-center justify-center py-2 relative">
       {/* Background Red Glow for emphasis during interference */}
       <div className="absolute inset-0 bg-red-500/10 blur-[40px] rounded-full opacity-0 animate-[pulse_2s_infinite]" />
       
       <h2 className="text-4xl md:text-6xl font-mono text-white tracking-widest uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] z-10 mix-blend-overlay">
           演出取消
       </h2>
       <div className="mt-4 flex flex-col items-center z-10">
         <span className="font-mono text-[10px] md:text-xs text-white/60 tracking-[0.8em] uppercase border-t border-b border-white/20 py-1">
             SIGNAL_LOST
         </span>
       </div>
    </div>
  );

  const handleScrollClick = () => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: 'smooth'
    });
  };

  return (
    <section ref={ref} className="min-h-screen flex flex-col justify-center items-center px-6 relative overflow-hidden perspective-1000 py-20">
      
      {/* The Black Hole / Singularity Visual */}
      
      {/* Outer Glow */}
      <motion.div 
        style={{ scale: holeScale, x: "-50%", y: "-50%" }}
        animate={{ rotate: -360 }}
        transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
        className="absolute top-[55%] left-1/2 w-[90vmin] h-[90vmin] rounded-full border border-white/5 opacity-40 pointer-events-none -z-10"
      />
      
      {/* Inner Glow */}
      <motion.div 
        style={{ scale: holeScale, x: "-50%", y: "-50%" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        className="absolute top-[55%] left-1/2 w-[70vmin] h-[70vmin] rounded-full border border-white/10 opacity-60 pointer-events-none -z-10"
      />
      
      {/* Event Horizon */}
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

        {/* Superposition Info Display */}
        <div className="relative h-40 md:h-48 w-full max-w-4xl flex items-center justify-center">
            
            {/* Layer 1: The Reality (Gig Info) - Becomes blurrier background when interference hits */}
            <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{ 
                    filter: isInterference ? "blur(12px)" : "blur(0px)",
                    opacity: isInterference ? 0.3 : 1,
                    scale: isInterference ? 0.95 : 1
                }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
                <GigInfoContent />
            </motion.div>

            {/* Layer 2: The Interference (Signal Lost) - Focuses in from the void */}
            <motion.div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                animate={{ 
                    filter: isInterference ? "blur(0px)" : "blur(20px)",
                    opacity: isInterference ? 1 : 0,
                    scale: isInterference ? 1 : 1.2
                }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
                <SignalLostContent />
            </motion.div>

        </div>

      </motion.div>
      
      {/* Scroll indicator (Minimalist: Just the Floating Arrow) */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.8, duration: 1.5, ease: "easeOut" }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 cursor-pointer group mix-blend-screen p-4"
        onClick={handleScrollClick}
      >
        <motion.div
            className="text-white/50 group-hover:text-white transition-colors duration-500"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
             <svg width="24" height="14" viewBox="0 0 20 12" fill="none" className="drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]">
                 <path d="M1 1L10 10L19 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
             </svg>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
