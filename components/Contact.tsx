import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { SOCIAL_LINKS, SITE_CONFIG } from '../content/data';
import { UI_TEXT } from '../content/ui';

// 4-Point Star (Diffraction Spike) Component
const StarFlare: React.FC<{ size?: number, className?: string }> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className}>
    {/* Concave 4-point star path */}
    <path d="M20 0 C22 15 25 18 40 20 C25 22 22 25 20 40 C18 25 15 22 0 20 C15 18 18 15 20 0 Z" fill="currentColor" />
  </svg>
);

// Elegant Arrow Component for Navigation
const ArrowIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="0.8" strokeLinecap="square" />
  </svg>
);

interface TechInputWrapperProps {
  children: React.ReactNode;
  id: string;
  label: string;
  value: string;
  isFocused: boolean;
  footerInfo?: React.ReactNode;
}

// Reusable Tech Input Wrapper Component
const TechInputWrapper: React.FC<TechInputWrapperProps> = ({ 
  children, 
  id, 
  label, 
  value, 
  isFocused, 
  footerInfo 
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative group w-full">
        {/* Tech Header info - fades in on hover/focus */}
        <div className={`flex justify-between items-end mb-1 md:mb-2 px-1 text-[9px] md:text-[10px] font-mono transition-opacity duration-500 ${isFocused || value ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`}>
          <span className={`tracking-[0.2em] transition-colors duration-300 ${isFocused ? 'text-white' : 'text-gray-600'}`}>
              /// {id.toUpperCase()}_DATA_STREAM
          </span>
          <span className={`tracking-widest transition-colors duration-300 ${isFocused ? 'text-white' : 'text-gray-600'}`}>
              STATUS: {isFocused ? 'ACTIVE' : 'STANDBY'}
          </span>
        </div>

        <div className="relative">
          {/* Main Backdrop & Glow */}
          <motion.div 
              className="absolute inset-0 bg-[#0a0a0a]/80 backdrop-blur-md transition-all duration-500"
              animate={{ 
                backgroundColor: isFocused ? 'rgba(20, 20, 30, 0.9)' : 'rgba(10, 10, 10, 0.6)',
                boxShadow: isFocused ? '0 0 30px rgba(255,255,255,0.05)' : 'none'
              }}
          />

          {/* Animated Corner Brackets */}
          <div className="absolute inset-0 pointer-events-none">
              <motion.div 
                  className="absolute top-0 left-0 border-l border-t border-white"
                  animate={{ width: isFocused ? 20 : 8, height: isFocused ? 20 : 8, opacity: isFocused ? 1 : 0.3 }}
              />
              <motion.div 
                  className="absolute top-0 right-0 border-r border-t border-white"
                  animate={{ width: isFocused ? 20 : 8, height: isFocused ? 20 : 8, opacity: isFocused ? 1 : 0.3 }}
              />
              <motion.div 
                  className="absolute bottom-0 left-0 border-l border-b border-white"
                  animate={{ width: isFocused ? 20 : 8, height: isFocused ? 20 : 8, opacity: isFocused ? 1 : 0.3 }}
              />
              <motion.div 
                  className="absolute bottom-0 right-0 border-r border-b border-white"
                  animate={{ width: isFocused ? 20 : 8, height: isFocused ? 20 : 8, opacity: isFocused ? 1 : 0.3 }}
              />
          </div>

          {/* Scanline Effect (Only when focused) */}
          <AnimatePresence>
            {isFocused && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none overflow-hidden rounded-sm"
              >
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-white/30 shadow-[0_0_15px_rgba(255,255,255,0.5)] animate-[scan_3s_linear_infinite]" />
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] opacity-20" />
              </motion.div>
            )}
          </AnimatePresence>

          {children}

          {/* Floating Label */}
          <motion.label 
            htmlFor={id} 
            className="absolute left-4 md:left-6 pointer-events-none font-light z-20 origin-top-left"
            initial={false}
            animate={{
              // Position adjustment
              top: isFocused || value 
                ? (isMobile ? '-1.5rem' : '-2rem') 
                : (isMobile ? '0.5rem' : '1rem'), // Adjusted for tighter padding
              
              x: 0,
              
              // Font Size adjustment: Reduced sizes
              fontSize: isFocused || value 
                ? (isMobile ? '0.65rem' : '0.75rem') // Focused state
                : (isMobile ? '0.875rem' : '1.25rem'), // Unfocused state
              
              color: isFocused ? '#ffffff' : (value ? '#6b7280' : '#4b5563'),
              letterSpacing: isFocused || value ? '0.2em' : 'normal'
            }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
              {isFocused || value ? label.toUpperCase() + ' //' : label}
          </motion.label>
        </div>

        {/* Footer Info */}
        <div className="flex justify-between items-start mt-1 md:mt-2 px-1 h-3 md:h-4">
          {footerInfo}
        </div>
    </div>
  );
};

// Abstract Collapsar (Singularity) Navigation Component
const CollapsarNav: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
       const threshold = window.innerHeight * 0.8;
       // With snap scrolling, this might trigger immediately on page 2
       // Using an element or context based trigger is better, but this simple check still works if container is window.
       // Note: In the new App structure, scroll listener is on the container, not window. 
       // This component should ideally check parent container scroll, but for simplicity we'll assume it's always visible on the second page.
       // However, since we are moving to snap scrolling, the nav might not be needed as much for vertical navigation, but useful for social links.
       // We'll leave it as 'visible' or rework logic.
       // Actually, 'CollapsarNav' is absolutely positioned fixed. 
       // We can just rely on user interaction or make it always accessible.
       // For now, let's keep it simple: always available or logic needs update if scroll tracking is lost.
       // Since Contact page is the second page, let's just show it.
    };
    
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSmallScreen(true);
      } else {
        setIsSmallScreen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  if (isSmallScreen) {
    return (
      <>
         <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
                opacity: 1, // Always visible on mobile for simplicity in new layout
                scale: 1,
                pointerEvents: 'auto'
            }}
            className="fixed top-6 right-6 z-50 p-4 mix-blend-difference text-white outline-none flex items-center justify-center"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Menu"
         >
             <div className="relative flex items-center justify-center w-8 h-8">
                 <motion.div 
                    className="absolute inset-[-4px] rounded-full border border-dashed border-white/50"
                    animate={{ rotate: 360, opacity: mobileMenuOpen ? 0.2 : 0.8 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                 />
                 <motion.div
                    animate={{ 
                        rotate: mobileMenuOpen ? 45 : 0,
                        scale: mobileMenuOpen ? 1.2 : 1
                    }}
                    transition={{ duration: 0.4, ease: "backOut" }}
                 >
                     <StarFlare size={24} className="fill-white" />
                 </motion.div>
             </div>
         </motion.button>

         <AnimatePresence>
           {mobileMenuOpen && (
             <motion.div
               initial={{ y: "-100%" }}
               animate={{ y: "0%" }}
               exit={{ y: "-100%", transition: { duration: 0.5, ease: "easeInOut" } }}
               transition={{ duration: 0.7, ease: [0.19, 1, 0.22, 1] }} 
               className="fixed inset-0 z-40 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center overflow-hidden"
             >
                 <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] border border-white/10 rounded-full animate-[spin_60s_linear_infinite]" />
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vw] border border-dashed border-white/10 rounded-full animate-[spin_40s_linear_infinite_reverse]" />
                 </div>

                 <nav className="flex flex-col items-center gap-10 relative z-10 w-full px-8">
                     <div className="w-px h-16 bg-gradient-to-b from-transparent to-white/30" />
                     <div className="text-[10px] font-mono tracking-[0.4em] text-gray-500 uppercase">
                         {UI_TEXT.CONTACT.NAV_SYSTEM_LABEL}
                     </div>
                     <div className="flex flex-col items-center gap-6 w-full">
                       {SOCIAL_LINKS.map((link, i) => (
                           <motion.a
                             key={link.id}
                             href={link.url}
                             target="_blank"
                             rel="noreferrer"
                             initial={{ opacity: 0, y: 20 }}
                             animate={{ opacity: 1, y: 0 }}
                             transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
                             className="text-3xl font-light text-white uppercase flex items-center justify-center group w-full"
                             onClick={() => setMobileMenuOpen(false)}
                           >
                               <span className="group-hover:text-gray-300 transition-colors tracking-[0.2em] mr-[-0.2em]">{link.name}</span>
                           </motion.a>
                       ))}
                     </div>
                     <div className="w-px h-16 bg-gradient-to-b from-white/30 to-transparent" />
                 </nav>
                 
                 <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="absolute bottom-12 text-[9px] font-mono text-gray-700 tracking-widest uppercase"
                 >
                     {UI_TEXT.CONTACT.MOBILE_INTERFACE_LABEL}
                 </motion.div>
             </motion.div>
           )}
         </AnimatePresence>
      </>
    );
  }

  return (
    <motion.div
      className="fixed right-0 top-1/2 -translate-x-1/2 z-50 pointer-events-auto"
      // Change logic: Always show 'peek' or 'expanded' if we are on desktop
      animate={isHovered ? "expanded" : "peek"}
      initial="peek"
      style={{ transformOrigin: 'right center' }}
      variants={{
        hidden: { x: "120%", opacity: 0 },
        peek: { x: "65%", opacity: 1 }, 
        expanded: { x: "0%", opacity: 1 } 
      }}
      transition={{ type: "spring", stiffness: 45, damping: 20 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative w-[320px] h-[320px] flex items-center justify-center">
         <div className="absolute inset-0 animate-[spin_20s_linear_infinite] opacity-80 pointer-events-none">
            <svg viewBox="0 0 320 320" className="w-full h-full drop-shadow-[0_0_2px_rgba(255,255,255,0.5)]">
              <defs>
                <path id="navTextPath" d="M 160, 160 m -140, 0 a 140,140 0 1,1 280,0 a 140,140 0 1,1 -280,0" />
              </defs>
              <text fontSize="8" letterSpacing="3">
                <textPath href="#navTextPath" startOffset="0%" className="fill-white font-mono uppercase font-bold">
                   {UI_TEXT.CONTACT.NAV_RING_TEXT}
                </textPath>
              </text>
            </svg>
         </div>
         <div className="absolute inset-8 rounded-full border border-white/20 border-dashed animate-[spin_30s_linear_infinite_reverse] pointer-events-none" />
         <div className="absolute inset-12 rounded-full border border-white/10 pointer-events-none" />
         <div className="absolute inset-14 rounded-full bg-black shadow-[0_0_30px_rgba(255,255,255,0.02)] overflow-hidden border border-white/5 transition-all duration-500 group">
             <div className="absolute inset-0 rounded-full shadow-[inset_4px_0_12px_rgba(255,255,255,0.05)] pointer-events-none" />
             <div className="absolute inset-0 flex flex-col justify-center items-center text-center z-10 p-8">
                {!isHovered && (
                  <motion.div 
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                     className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-1"
                  >
                     <motion.div
                        animate={{ x: [-2, 2, -2], opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                     >
                        <ArrowIcon className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]" />
                     </motion.div>
                     <div className="w-8 h-px bg-gradient-to-l from-white/30 to-transparent" />
                  </motion.div>
                )}
                <motion.div 
                   animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0.95 }}
                   transition={{ duration: 0.3 }}
                   className="flex flex-col gap-4 w-full"
                >
                   {SOCIAL_LINKS.map((link, i) => (
                      <a 
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group/item flex items-center justify-between border-b border-white/10 pb-1 hover:border-white/50 transition-colors"
                      >
                         <span className="text-xs font-light text-gray-400 group-hover/item:text-white tracking-widest transition-colors">
                            {link.name}
                         </span>
                         <span className="text-[8px] font-mono text-gray-600 group-hover/item:text-white/60">
                            ↗
                         </span>
                      </a>
                   ))}
                   <div className="mt-2 flex justify-center">
                       <div className="h-px w-12 bg-white/20" />
                   </div>
                </motion.div>
             </div>
         </div>
      </div>
    </motion.div>
  );
};

const Contact: React.FC = () => {
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [honey, setHoney] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [focusedField, setFocusedField] = useState<'message' | 'email' | null>(null);
  const [nextUrl, setNextUrl] = useState('');
  
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const baseUrl = window.location.href.split('?')[0];
    setNextUrl(`${baseUrl}?success=true`);

    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
        setIsSent(true);
        if (sectionRef.current) {
            sectionRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }
  }, []);

  const handleReset = () => {
    setIsSent(false);
    const baseUrl = window.location.href.split('?')[0];
    window.history.replaceState({}, '', baseUrl);
  };

  const titleVariants: Variants = {
    hidden: { 
      letterSpacing: "0em", 
      opacity: 0, 
      marginRight: "0em",
    },
    visible: { 
      letterSpacing: "0.5em",
      opacity: 1, 
      marginRight: "-0.5em",
      textShadow: "none",
      transition: { duration: 2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }
    },
    sent: {
      letterSpacing: "-0.15em",
      opacity: 1,
      marginRight: "0em",
      textShadow: "0 0 30px rgba(255,255,255,0.8)",
      transition: { duration: 1.5, ease: "easeInOut" }
    }
  };

  return (
    <section ref={sectionRef} id="contact-section" className="h-full w-full relative z-10 overflow-hidden flex flex-col items-center justify-start pt-[15vh] md:pt-[20vh]">
      
      {/* Background Rotating Rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[150vw] pointer-events-none -z-10 opacity-10">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white"
            style={{
              width: `${40 + i * 20}%`,
              height: `${40 + i * 20}%`,
              borderStyle: i % 2 === 0 ? 'solid' : 'dashed',
            }}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{ duration: 60 + i * 20, repeat: Infinity, ease: "linear" }}
          />
        ))}
      </div>

      {/* --- TITLE SECTION --- */}
      <div className="mb-6 flex flex-col items-center relative z-20 shrink-0">
         <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative text-center flex flex-col items-center"
         >
            <motion.h2 
               variants={titleVariants}
               initial="hidden"
               whileInView={isSent ? "sent" : "visible"}
               animate={isSent ? "sent" : undefined}
               viewport={{ once: true }}
               className="font-light text-white mix-blend-screen z-10 whitespace-nowrap text-4xl md:text-6xl drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
            >
               {isSent ? UI_TEXT.CONTACT.TITLE_SENT : UI_TEXT.CONTACT.TITLE_DEFAULT}
            </motion.h2>

            <AnimatePresence>
                {!isSent && (
                   <motion.div
                     initial={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                     className="flex flex-col items-center"
                   >
                      <motion.div 
                         initial={{ scaleY: 0 }}
                         whileInView={{ scaleY: 1 }}
                         transition={{ delay: 0.5, duration: 1.5 }}
                         className="w-px h-6 bg-gradient-to-b from-transparent via-white/50 to-transparent mx-auto mt-2" 
                      />

                      <motion.p 
                         initial={{ opacity: 0, y: 10 }}
                         whileInView={{ opacity: 0.5, y: 0 }}
                         transition={{ duration: 1 }}
                         className="text-[10px] md:text-xs font-mono text-gray-400 mt-2 tracking-[0.4em] uppercase"
                      >
                         {UI_TEXT.CONTACT.SUBTITLE_DEFAULT}
                      </motion.p>
                   </motion.div>
                )}
            </AnimatePresence>
         </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {!isSent ? (
          <motion.form 
            key="contact-form"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            action={SITE_CONFIG.FORM_ENDPOINT}
            method="POST"
            target="_self"
            onSubmit={() => setIsSending(true)}
            className="w-full max-w-2xl space-y-5 md:space-y-8 relative mb-2 flex flex-col justify-center shrink-0 px-6 md:px-0"
          >
            <input type="hidden" name="_next" value={nextUrl} />
            <input type="hidden" name="_captcha" value="false" />
            <input type="hidden" name="_template" value="table" />
            <input type="hidden" name="_subject" value={`${UI_TEXT.CONTACT.SUBJECT_TEMPLATE}${email}`} />
            
            <input 
                type="text" 
                name="_honey" 
                style={{ display: 'none' }} 
                value={honey}
                onChange={(e) => setHoney(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
            />

            <TechInputWrapper 
              id="message" 
              label={UI_TEXT.CONTACT.INPUT_MESSAGE_LABEL}
              value={message} 
              isFocused={focusedField === 'message'}
              footerInfo={
                 <>
                    <div className="flex gap-1 items-center">
                       {focusedField === 'message' && (
                           <div className="animate-pulse">
                               <StarFlare size={8} className="text-white fill-white" />
                           </div>
                       )}
                    </div>
                    <span className="font-mono text-[9px] md:text-[10px] text-gray-600 tracking-widest">
                       SIZE: {new Blob([message]).size}{UI_TEXT.CONTACT.INPUT_MESSAGE_SIZE_SUFFIX}
                    </span>
                 </>
              }
            >
              <textarea
                required
                name="message" 
                rows={2} 
                value={message}
                onFocus={() => setFocusedField('message')}
                onBlur={() => setFocusedField(null)}
                onChange={(e) => setMessage(e.target.value)}
                className="relative block w-full bg-transparent p-2 pl-4 md:p-4 md:pl-6 text-base md:text-xl font-light text-white/90 placeholder-transparent focus:outline-none resize-none z-10 font-sans tracking-wide leading-relaxed custom-scrollbar"
                placeholder="内容"
                id="message"
                style={{ scrollbarWidth: 'none' }} 
              />
            </TechInputWrapper>

            <TechInputWrapper 
              id="email" 
              label={UI_TEXT.CONTACT.INPUT_EMAIL_LABEL}
              value={email} 
              isFocused={focusedField === 'email'}
              footerInfo={
                <div className="w-full flex justify-end">
                   <span className="font-mono text-[9px] md:text-[10px] text-gray-600 tracking-widest">
                      {email ? UI_TEXT.CONTACT.ID_DETECTED : UI_TEXT.CONTACT.NO_ID}
                   </span>
                </div>
              }
            >
              <input
                type="email"
                required
                name="email"
                value={email}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                onChange={(e) => setEmail(e.target.value)}
                className="relative block w-full bg-transparent p-2 pl-4 md:p-4 md:pl-6 text-base md:text-xl font-light text-white/90 placeholder-transparent focus:outline-none z-10 font-sans tracking-wide"
                placeholder="Email"
                id="email"
                autoComplete="off"
              />
            </TechInputWrapper>

            <div className="pt-2 flex justify-center items-center relative z-20">
                <button
                  type="submit"
                  disabled={isSending}
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  className="relative w-32 h-32 md:w-48 md:h-48 flex items-center justify-center outline-none bg-transparent group"
                >
                  <div className="absolute inset-0 animate-[spin_12s_linear_infinite] opacity-20 pointer-events-none">
                    <svg viewBox="0 0 200 200" className="w-full h-full">
                      <defs>
                        <path id="circlePath" d="M 100, 100 m -80, 0 a 80,80 0 1,1 160,0 a 80,80 0 1,1 -160,0" />
                      </defs>
                      <text fontSize="8.5" letterSpacing="4">
                        <textPath href="#circlePath" startOffset="0%" className="fill-white font-mono uppercase">
                          /// COLLAPSAR SYSTEM /// TRANSMISSION PROTOCOL /// READY ///
                        </textPath>
                      </text>
                    </svg>
                  </div>

                  <motion.div
                    className="absolute w-28 h-28 md:w-44 md:h-44 rounded-full border border-white/20 border-dashed"
                    animate={{ rotate: isSending ? 360 : (isHovered ? 90 : 0) }}
                    transition={{ duration: isSending ? 6 : 10, ease: "linear", repeat: isSending ? Infinity : 0 }}
                  />
                  <motion.div
                    className="absolute w-24 h-24 md:w-36 md:h-36 rounded-full border border-white/30 border-t-transparent border-b-transparent"
                    animate={{ rotate: isSending ? -360 : (isHovered ? -180 : 0) }}
                    transition={{ duration: isSending ? 4 : 8, ease: "linear", repeat: isSending ? Infinity : 0 }}
                  />
                  
                  <motion.div
                    className="relative z-10 w-16 h-16 md:w-24 md:h-24 rounded-full bg-black border border-white/50 flex items-center justify-center overflow-hidden transition-all duration-500"
                    whileHover={{ scale: 1.05, borderColor: "rgba(255,255,255,1)", boxShadow: "0 0 30px rgba(255,255,255,0.2)" }}
                    animate={{ 
                        scale: isSending ? [1, 0.98, 1] : 1, 
                        borderColor: isSending ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)"
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-transparent transition-transform duration-1000 ${isHovered ? 'translate-y-[-100%] animate-[scan_1.5s_linear_infinite]' : 'translate-y-[100%]'}`} />
                    
                    {isSending && (
                        <motion.div 
                            className="absolute inset-0 bg-white"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0.15, 0] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                        />
                    )}

                    <div className="flex flex-col items-center gap-1.5 relative z-20">
                        <motion.span 
                            animate={{ opacity: isSending ? [1, 0.4, 1] : 1 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            className={`text-[9px] md:text-xs tracking-[0.3em] font-mono transition-colors duration-300 ${isSending ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}
                        >
                            {isSending ? UI_TEXT.CONTACT.BUTTON_SENDING : UI_TEXT.CONTACT.BUTTON_TRANSMIT}
                        </motion.span>
                    </div>
                  </motion.div>
                </button>
            </div>
          </motion.form>
        ) : (
          <motion.div
            key="success-view"
            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-full max-w-2xl flex flex-col items-center justify-center text-center relative z-20 mb-20"
          >
              <div className="space-y-4 mb-16">
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 1 }}
                    className="font-mono text-xs text-gray-500 tracking-[0.2em]"
                  >
                     {UI_TEXT.CONTACT.SUCCESS_ACK_PREFIX} {Math.floor(Math.random() * 10000).toString().padStart(4, '0')}-{Date.now().toString().slice(-4)}
                  </motion.p>
              </div>

              <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mb-16 px-8 md:px-0">
                  {SOCIAL_LINKS.map((link, index) => (
                      <motion.a
                        key={link.id}
                        href={link.url}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 + 0.5 }}
                        className="group flex items-center justify-between p-4 border border-white/10 hover:border-white/40 hover:bg-white/5 transition-all duration-300"
                      >
                          <div className="flex flex-col items-start">
                              <span className="text-[10px] font-mono text-gray-500 group-hover:text-white/80 tracking-widest mb-1">
                                  {UI_TEXT.CONTACT.CHANNEL_PREFIX}{index + 1}
                              </span>
                              <span className="text-sm font-light tracking-[0.2em] text-white">
                                  {link.name}
                              </span>
                          </div>
                          <span className="text-white/20 group-hover:text-white transform group-hover:rotate-45 transition-all duration-300">
                              ↗
                          </span>
                      </motion.a>
                  ))}
              </div>

              <button
                 onClick={handleReset}
                 className="group relative px-8 py-3 overflow-hidden"
              >
                  <span className="relative z-10 font-mono text-xs tracking-[0.3em] text-gray-400 group-hover:text-white transition-colors duration-300">
                      {UI_TEXT.CONTACT.BUTTON_RESET}
                  </span>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-px bg-white group-hover:w-full transition-all duration-500 ease-out" />
              </button>

          </motion.div>
        )}
      </AnimatePresence>

      <CollapsarNav />

      <motion.footer 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
        className="absolute bottom-3 md:bottom-10 text-center font-mono text-gray-700 text-xs tracking-[0.3em]"
      >
        {UI_TEXT.CONTACT.FOOTER_COPYRIGHT}
      </motion.footer>
      
      <style>{`
        @keyframes scan {
            0% { transform: translateY(100%); }
            100% { transform: translateY(-100%); }
        }
      `}</style>
    </section>
  );
};

export default Contact;