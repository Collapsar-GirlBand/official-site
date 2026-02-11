import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { UI_TEXT } from '../content/ui';

interface HeroProps {
  onOpenGame: () => void;
  containerRef: React.RefObject<HTMLElement>;
}

const Hero: React.FC<HeroProps> = ({ onOpenGame, containerRef }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    container: containerRef,
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
      // 1. Stable State - Duration: 4s
      setIsInterference(false);
      
      timer = setTimeout(() => {
        if (!isMounted) return;
        
        // 2. Interference State - Duration: 2s
        setIsInterference(true);
        
        timer = setTimeout(() => {
           if (!isMounted) return;
           runLoop();
        }, 2000);
        
      }, 4000);
    };

    runLoop();

    return () => {
        isMounted = false;
        clearTimeout(timer);
    };
  }, []);

  // Visual Components
  const GigInfoContent = () => {
    return (
      <div className="flex flex-col items-center space-y-4">
          {/* Swapped Styles: English Description First (Top) - Now LARGER (Main Title Style) */}
          {/* Layout Logic: 
              Desktop: Single Line 
              Mobile: A GIRL BAND \n FROM YANGTZE DELTA (Kept together)
          */}
          <h2 className="text-lg md:text-3xl font-light tracking-[0.15em] text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] uppercase text-center leading-relaxed md:leading-normal">
              <span className="block md:inline whitespace-nowrap">A GIRL BAND</span>
              <span className="block md:inline md:ml-3 whitespace-nowrap">
                 FROM YANGTZE DELTA
              </span>
          </h2>
          
          <div className="w-12 h-px bg-white/30" />
          
          {/* Swapped Styles: Chinese Subtitle Second (Bottom) - Now SMALLER (Remark Style) */}
          <div className="flex items-center justify-center text-xs md:text-sm font-mono tracking-[0.2em] whitespace-nowrap text-white/60">
              {UI_TEXT.HERO.SUBTITLE}
          </div>
      </div>
    );
  };

  const SignalLostContent = () => (
    <div className="flex flex-col items-center justify-center py-2 relative group-hover:scale-105 transition-transform duration-300">
       {/* Background Glow */}
       <div className="absolute inset-0 bg-white/10 blur-[30px] rounded-full opacity-0 animate-[pulse_1s_infinite]" />
       
       <h2 className="text-3xl md:text-5xl font-bold text-white tracking-[0.3em] uppercase drop-shadow-[0_0_20px_rgba(255,255,255,1)] z-10 mix-blend-overlay">
           {UI_TEXT.HERO.ACTION_MAIN}
       </h2>
       <div className="mt-4 flex flex-col items-center z-10">
         <span className="font-mono text-[10px] md:text-xs text-white tracking-[0.5em] uppercase border-t border-b border-white/50 py-1 bg-black/50 px-2">
             {UI_TEXT.HERO.ACTION_SUB}
         </span>
       </div>
    </div>
  );

  const handleScrollClick = () => {
    if (containerRef.current) {
        const height = containerRef.current.clientHeight;
        containerRef.current.scrollTo({
            top: height,
            behavior: 'smooth'
        });
    }
  };

  return (
    <section ref={ref} className="h-full w-full flex flex-col justify-center items-center px-6 relative overflow-hidden perspective-1000">
      
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
        {/* Band Name Group */}
        <div className="flex flex-col items-center">
            <motion.h1 
              initial={{ opacity: 0, scale: 0.9, letterSpacing: "0em" }}
              animate={{ opacity: 1, scale: 1, letterSpacing: "-0.05em" }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="text-[12vw] leading-none font-light text-white select-none mix-blend-difference"
            >
              {UI_TEXT.HERO.BAND_NAME}
            </motion.h1>
            
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
                className="mt-2 md:mt-4"
            >
                 <span className="text-lg md:text-2xl font-light tracking-[1.5em] text-white/80 pl-[1.5em] mix-blend-difference">
                    {UI_TEXT.HERO.BAND_CN_NAME}
                 </span>
            </motion.div>
        </div>

        {/* Divider */}
        <motion.div 
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="w-px bg-white/50 h-16 md:h-32 origin-top"
        />

        {/* Superposition Info Display (Clickable) */}
        <motion.div 
            className="relative h-40 md:h-48 w-full max-w-4xl flex items-center justify-center cursor-pointer group"
            onClick={onOpenGame}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
        >
            
            {/* Layer 1: Default/Stable (Click to Observe) -> SignalLostContent */}
            <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{ 
                    filter: isInterference ? "blur(12px)" : "blur(0px)",
                    opacity: isInterference ? 0.3 : 1,
                    scale: isInterference ? 0.95 : 1
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
            >
                <SignalLostContent />
            </motion.div>

            {/* Layer 2: Interference/Glitch (Band Info) -> GigInfoContent */}
            <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{ 
                    filter: isInterference ? "blur(0px)" : "blur(20px)",
                    opacity: isInterference ? 1 : 0,
                    scale: isInterference ? 1 : 1.2
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
            >
                <GigInfoContent />
            </motion.div>

        </motion.div>

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