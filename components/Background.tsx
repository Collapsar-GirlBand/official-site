import React, { useEffect, useRef, useState } from 'react';

const Background: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [opacity, setOpacity] = useState(0);

  // 1. Scroll Listener for Fade-In Effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      
      // Start fading in earlier (at 20% of first screen) to ensure visibility by the time we reach timeline
      const startFade = windowHeight * 0.2;
      const endFade = windowHeight * 0.8;
      
      let newOpacity = (scrollY - startFade) / (endFade - startFade);
      
      // Clamp values
      if (newOpacity < 0) newOpacity = 0;
      if (newOpacity > 1) newOpacity = 1;
      
      setOpacity(newOpacity);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 2. Particle System Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let mouse = { x: -1000, y: -1000 };

    const updateDimensions = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    updateDimensions();

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      baseAlpha: number;
      phase: number; // For twinkling sine wave
    }

    const particles: Particle[] = [];

    const initParticles = () => {
      particles.length = 0;
      
      // Dynamic Particle Count Calculation
      // 1920x1080 is approx 2,000,000 pixels. Previous fixed count was 150.
      // Original density divisor was 13000. 
      // To increase density by 1.5x, we reduce divisor: 13000 / 1.5 = ~8666. Using 8500.
      const area = width * height;
      const densityDivisor = 8500;
      const calculatedCount = Math.floor(area / densityDivisor);
      
      // Set bounds: Minimum 50 particles (for small mobile), Maximum 450 (for 4k) to manage perf
      const particleCount = Math.min(Math.max(calculatedCount, 50), 450);

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.5, // Drift velocity
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 2 + 1, // Slightly smaller for dust/circle look
          alpha: Math.random(),
          baseAlpha: Math.random() * 0.4 + 0.2, 
          phase: Math.random() * Math.PI * 2,
        });
      }
    };

    initParticles();

    let animationFrameId: number;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Iterate backwards to allow safe removal of particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // 1. Natural Movement
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around screen
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        // 2. Twinkling (Sine wave based on time/frame)
        p.phase += 0.05;
        p.alpha = p.baseAlpha + Math.sin(p.phase) * 0.15;
        if(p.alpha < 0) p.alpha = 0;

        // Initialize draw variables for this frame
        let drawAlpha = p.alpha;
        let drawSize = p.size;

        // 3. Mouse Interaction (Attraction & Annihilation)
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const attractionRadius = 300; 
        const killRadius = 5; 
        const fadeRadius = 25; 

        if (dist < killRadius) {
          // Annihilate: Remove particle permanently
          particles.splice(i, 1);
          continue; // Skip drawing for this particle
        } else if (dist < attractionRadius) {
          const force = (attractionRadius - dist) / attractionRadius;
          const easeForce = force * force * force; 
          
          const angle = Math.atan2(dy, dx);
          const suctionSpeed = 1.5 * easeForce; 
          
          p.x += Math.cos(angle) * suctionSpeed;
          p.y += Math.sin(angle) * suctionSpeed;
          
          if (dist < fadeRadius) {
            // Linear fading (more consistent than smoothStep)
            const t = (dist - killRadius) / (fadeRadius - killRadius);
            // Directly apply linear factor t
            drawAlpha *= t;
            drawSize *= (0.4 + 0.6 * t); 
          } else {
            drawAlpha = Math.min(1, drawAlpha + easeForce * 0.2);
          }
        }

        // Draw Circle (Dust)
        if (drawAlpha > 0.01) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, drawSize, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(220, 230, 255, ${drawAlpha})`;
            ctx.fill();
            ctx.closePath();
            
            // Glow effect
            if (drawSize > 2 && drawAlpha > 0.2) {
                ctx.shadowBlur = 4 * drawAlpha; 
                ctx.shadowColor = `rgba(255, 255, 255, ${0.3 * drawAlpha})`;
                // Redraw to apply shadow
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    
    const handleTouchMove = (e: TouchEvent) => {
        if(e.touches.length > 0) {
            mouse.x = e.touches[0].clientX;
            mouse.y = e.touches[0].clientY;
        }
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('resize', () => {
      updateDimensions();
      initParticles();
    });
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none transition-opacity duration-1000 ease-out z-[1]"
      style={{ 
          opacity: opacity,
          mixBlendMode: 'screen' 
      }}
    />
  );
};

export default Background;