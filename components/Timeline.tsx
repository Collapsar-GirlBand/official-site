import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PAST_GIGS } from '../constants';

// Internal Star Component for consistency
const StarFlare: React.FC<{ size?: number, className?: string }> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className}>
    <path d="M20 0 C22 15 25 18 40 20 C25 22 22 25 20 40 C18 25 15 22 0 20 C15 18 18 15 20 0 Z" fill="currentColor" />
  </svg>
);

const Timeline: React.FC = () => {
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Sort gigs by date descending
  const sortedGigs = useMemo(() => {
    return [...PAST_GIGS].sort((a, b) => {
      const dateA = new Date(a.date.replace(/\./g, '-')).getTime();
      const dateB = new Date(b.date.replace(/\./g, '-')).getTime();
      return dateB - dateA;
    });
  }, []);

  const INITIAL_DISPLAY_COUNT = 3;
  const visibleGigs = isExpanded ? sortedGigs : sortedGigs.slice(0, INITIAL_DISPLAY_COUNT);
  const hasHiddenGigs = sortedGigs.length > INITIAL_DISPLAY_COUNT;

  // Animation Variants
  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 50, 
      filter: "blur(10px)",
      scale: 0.95
    },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      scale: 1,
      transition: {
        duration: 0.8,
        ease: [0.25, 0.46, 0.45, 0.94], // Cinematic easing
        delay: i * 0.15 // Stagger delay based on index
      }
    }),
    exit: { 
      opacity: 0, 
      y: -30, 
      filter: "blur(10px)", 
      scale: 0.95,
      transition: { duration: 0.4, ease: "easeIn" } 
    }
  };

  return (
    // UPDATED: Removed 'justify-center' to prevent layout jump when expanding. 
    // Kept 'flex-col' for structure. Content will now flow downwards from the top padding.
    <section className="py-16 md:py-24 px-4 relative z-10 overflow-hidden min-h-screen flex flex-col">
      
      {/* Background Subtle Constellation Hints */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
         <svg className="w-full h-full">
            <pattern id="star-grid" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
               <circle cx="1" cy="1" r="1" fill="white" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#star-grid)" />
         </svg>
      </div>

      {/* Header */}
      <div className="mb-10 md:mb-16 flex flex-col items-center relative z-20">
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-center"
        >
          {/* UPDATED: Added mr-[-0.5em] to compensate for the trailing letter-spacing space */}
          <h2 className="text-4xl md:text-6xl font-light tracking-[0.5em] mr-[-0.5em] text-white mix-blend-screen z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            往期演出
          </h2>
          <div className="h-8 md:h-12 w-px bg-gradient-to-b from-white to-transparent mx-auto mt-4 md:mt-6 opacity-50" />
          <p className="text-[10px] md:text-xs font-mono text-gray-400 mt-2 tracking-[0.4em] uppercase">
            Past_Events_Constellation
          </p>
        </motion.div>
      </div>

      {/* --- Constellation Timeline Container --- */}
      <div className="max-w-5xl mx-auto relative w-full">
        
        {/* Subtle Vertical Guide (Dashed/Fading) */}
        <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px border-r border-dashed border-white/10 -translate-x-1/2 md:translate-x-0 pointer-events-none transition-all duration-1000" />

        <motion.div 
          layout
          className="flex flex-col gap-6 md:gap-8 pb-4 md:pb-8 relative"
        >
          <AnimatePresence mode='popLayout'>
            {visibleGigs.map((gig, index) => {
              const isEven = index % 2 === 0;
              const isHovered = hoveredId === gig.id;
              
              const isNewlyAdded = index >= INITIAL_DISPLAY_COUNT;
              const delayIndex = isNewlyAdded ? index - INITIAL_DISPLAY_COUNT : 0;
              const hasUrl = !!gig.url;

              return (
                <motion.div 
                  layout="position"
                  key={gig.id}
                  custom={delayIndex} 
                  variants={itemVariants}
                  initial="hidden"
                  whileInView={!isNewlyAdded ? "visible" : undefined}
                  animate={isNewlyAdded ? "visible" : undefined}
                  exit="exit"
                  viewport={{ once: true, margin: "-10%" }}
                  onMouseEnter={() => setHoveredId(gig.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`relative flex items-center md:justify-center w-full group ${hasUrl ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  {/* Link Overlay */}
                  {hasUrl && (
                    <a 
                      href={gig.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="absolute inset-0 z-50"
                      aria-label={`View details for ${gig.location} gig`}
                    />
                  )}
                  
                  {/* --- THE STAR (Center Node) --- */}
                  <div className="absolute left-6 md:left-1/2 -translate-x-1/2 flex items-center justify-center z-30">
                      <div className="absolute w-12 h-12 bg-transparent rounded-full z-40" />
                      
                      <motion.div 
                        className="relative z-20"
                        animate={{ 
                            scale: isHovered ? 1.5 : 1,
                            filter: isHovered ? "drop-shadow(0 0 8px rgba(255,255,255,0.8))" : "drop-shadow(0 0 0px rgba(255,255,255,0))"
                        }}
                        transition={{ duration: 0.4 }}
                      >
                         <StarFlare size={16} className={`fill-current ${isHovered ? 'text-white' : 'text-gray-300'}`} />
                      </motion.div>
                      
                      <motion.div 
                        className="absolute border border-white/30 rounded-full"
                        style={{ width: 20, height: 20 }}
                        animate={{ rotate: 360, scale: isHovered ? 1.5 : 1, opacity: isHovered ? 0.8 : 0.3 }}
                        transition={{ rotate: { duration: 10, repeat: Infinity, ease: "linear" }, scale: { duration: 0.4 } }}
                      />
                      <motion.div 
                        className="absolute border border-white/10 rounded-full"
                        style={{ width: 32, height: 32 }}
                        animate={{ rotate: -360, scale: isHovered ? 1.2 : 1 }}
                        transition={{ rotate: { duration: 15, repeat: Infinity, ease: "linear" }, scale: { duration: 0.4 } }}
                      />
                  </div>

                  {/* --- CONNECTOR (Angled SVG) --- */}
                  <div className={`hidden md:block absolute top-1/2 -translate-y-1/2 pointer-events-none 
                      ${isEven ? 'right-[50%] mr-1' : 'left-[50%] ml-1'}
                  `}>
                      <svg width="120" height="60" viewBox="0 0 120 60" className={`overflow-visible ${isEven ? 'transform -scale-x-100' : ''}`}>
                          <defs>
                              <linearGradient id={`grad-${gig.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                                  <stop offset="50%" stopColor="rgba(255,255,255,0.5)" />
                                  <stop offset="100%" stopColor="rgba(255,255,255,1)" />
                              </linearGradient>
                          </defs>
                          <path 
                            d="M 0,30 L 40,30 L 70,50 L 120,50" 
                            fill="none" 
                            stroke="rgba(255,255,255,0.1)" 
                            strokeWidth="1" 
                          />
                          <motion.path 
                             d="M 0,30 L 40,30 L 70,50 L 120,50" 
                             fill="none" 
                             stroke={`url(#grad-${gig.id})`}
                             strokeWidth="1.5"
                             initial={{ pathLength: 0, opacity: 0 }}
                             animate={{ 
                                 pathLength: isHovered ? 1 : 0, 
                                 opacity: isHovered ? 1 : 0 
                             }}
                             transition={{ duration: 0.5, ease: "easeInOut" }}
                          />
                          <motion.g
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: isHovered ? 1 : 0, opacity: isHovered ? 1 : 0 }}
                            transition={{ delay: 0.3 }}
                            transform="translate(120, 50)" 
                          >
                             <g transform="translate(-5, -5)"> 
                                <path d="M5 0 C5.5 3.75 6.25 4.5 10 5 C6.25 5.5 5.5 6.25 5 10 C4.5 6.25 3.75 5.5 0 5 C3.75 4.5 4.5 3.75 5 0 Z" fill="white" />
                             </g>
                          </motion.g>
                      </svg>
                  </div>
                  
                  {/* Mobile Connector */}
                  <div className="absolute left-6 md:hidden w-8 h-px bg-white/20 top-1/2 -translate-y-1/2" />


                  {/* --- TEXT CONTENT --- */}
                  <motion.div 
                    className={`
                        flex flex-col justify-center relative
                        pl-20 md:pl-0 
                        w-full md:w-[35%] 
                        ${isEven ? 'md:mr-auto md:text-right md:items-end md:pr-12' : 'md:ml-auto md:text-left md:items-start md:pl-12'}
                        md:mt-2
                    `}
                    animate={{ 
                        x: isHovered ? (isEven ? -10 : 10) : 0,
                        opacity: isHovered ? 1 : 0.7 
                    }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  >
                      <h3 className="font-mono text-2xl md:text-3xl tracking-[0.2em] mb-1 text-white">
                          {gig.date}
                      </h3>
                      
                      <div className={`flex flex-col gap-0.5 ${isEven ? 'md:items-end' : 'md:items-start'}`}>
                          <span className={`text-lg font-light tracking-widest transition-colors duration-300 ${isHovered ? 'text-white' : 'text-gray-300'}`}>
                              {gig.location}
                          </span>
                          <span className="text-xs md:text-sm font-mono text-gray-500 uppercase tracking-widest">
                              {gig.venue}
                          </span>
                      </div>

                      <motion.div 
                        className={`absolute top-0 -mt-4 text-[8px] text-gray-600 font-mono tracking-widest
                            ${isEven ? 'right-0' : 'left-0'}
                        `}
                        animate={{ opacity: isHovered ? 1 : 0 }}
                      >
                          {hasUrl ? '/// LINK_DETECTED' : `/// COORD_${gig.id}`}
                      </motion.div>
                  </motion.div>

                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {/* --- EXPAND BUTTON --- */}
        {hasHiddenGigs && (
          <motion.div 
            layout 
            className="flex justify-center mt-4 md:mt-8 relative z-20"
          >
             <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="group relative flex flex-col items-center gap-4 outline-none cursor-pointer"
            >
               <motion.div 
                 className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent"
                 animate={{ opacity: [0.2, 0.6, 0.2] }}
                 transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
               />
               
               <motion.div 
                 layout="position"
                 className="relative overflow-hidden"
               >
                 <span className="relative font-mono text-[10px] tracking-[0.4em] text-gray-500 group-hover:text-white transition-colors duration-300 uppercase block">
                    {isExpanded ? 'Collapse_Starmap' : 'Load_More_Data'}
                 </span>
                 <span className="absolute bottom-0 left-0 w-full h-[1px] bg-white transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out" />
               </motion.div>
            </button>
          </motion.div>
        )}

      </div>
    </section>
  );
};

export default Timeline;
