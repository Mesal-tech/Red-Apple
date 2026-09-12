import React, { useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

// =========================================================================
// DEDICATED VIDEO SLOTS FOR EACH STORYTELLING STAGE
// =========================================================================
export const VIDEO_BEAT_1 = '/Cinematic_documentary_slow_mot.mp4'; // Screen 1: Next generation
export const VIDEO_BEAT_2 = '/Cinematic_documentary_aerial_d.mp4'; // Screen 2: Rural clinic / aerial reality
export const VIDEO_BEAT_3 = '/Cinematic_documentary_aerial_d - Copy.mp4'; // Screen 3: Telemedicine / future of health

export const ImpactSection: React.FC = () => {
  const containerRef = useRef<HTMLElement>(null);

  // Screen 1 Refs
  const screen1Ref = useRef<HTMLDivElement>(null);
  const s1HeadlineRef = useRef<HTMLDivElement>(null);
  const s1GenerationsRef = useRef<HTMLDivElement>(null);
  const s1StatLeftRef = useRef<HTMLDivElement>(null);
  const s1StatRightRef = useRef<HTMLDivElement>(null);
  const s1ApertureRef = useRef<HTMLDivElement>(null);

  // Screen 2 Refs
  const screen2Ref = useRef<HTMLDivElement>(null);
  const s2ParagraphRef = useRef<HTMLDivElement>(null);
  const s2StatLeftRef = useRef<HTMLDivElement>(null);
  const s2StatRightRef = useRef<HTMLDivElement>(null);
  const s2ApertureRef = useRef<HTMLDivElement>(null);

  // Screen 3 Refs
  const screen3Ref = useRef<HTMLDivElement>(null);
  const s3HeadlineRef = useRef<HTMLDivElement>(null);
  const s3ApertureRef = useRef<HTMLDivElement>(null);

  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  useGSAP(
    () => {
      if (!containerRef.current) return;

      // =======================================================================
      // 1. SCREEN 1 SCROLL-BASED ENTRY ANIMATION
      // =======================================================================
      if (screen1Ref.current) {
        // A. Staircase headline lines stagger in with slide-up & fade across full entry
        const s1Lines = s1HeadlineRef.current?.querySelectorAll('.staircase-line');
        if (s1Lines && s1Lines.length > 0) {
          gsap.fromTo(
            s1Lines,
            {
              y: (i) => 70 + i * 20,
              opacity: 0,
              scale: 0.94,
            },
            {
              y: 0,
              opacity: 1,
              scale: 1,
              ease: 'power2.out',
              stagger: 0.08,
              scrollTrigger: {
                trigger: screen1Ref.current,
                start: 'top 90%',
                end: 'top top',
                scrub: 1.2,
              },
            }
          );
        }

        // B. "GENERATIONS" floats in from the right
        if (s1GenerationsRef.current) {
          gsap.fromTo(
            s1GenerationsRef.current,
            { x: 100, opacity: 0 },
            {
              x: 0,
              opacity: 1,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: screen1Ref.current,
                start: 'top 85%',
                end: 'top top',
                scrub: 1.3,
              },
            }
          );
        }

        // C. Bottom clinical data callouts float up
        gsap.fromTo(
          [s1StatLeftRef.current, s1StatRightRef.current],
          { y: 60, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            ease: 'power2.out',
            stagger: 0.15,
            scrollTrigger: {
              trigger: screen1Ref.current,
              start: 'top 75%',
              end: 'top top',
              scrub: 1.2,
            },
          }
        );

        // D. Aperture subtle scaling reveal
        if (s1ApertureRef.current) {
          gsap.fromTo(
            s1ApertureRef.current,
            { scale: 0.92, opacity: 0.5 },
            {
              scale: 1,
              opacity: 1,
              ease: 'power1.out',
              scrollTrigger: {
                trigger: screen1Ref.current,
                start: 'top 90%',
                end: 'top top',
                scrub: 1.4,
              },
            }
          );
        }
      }

      // =======================================================================
      // 2. SCREEN 2 SCROLL-BASED ENTRY ANIMATION
      // =======================================================================
      if (screen2Ref.current) {
        // A. Centered statement zooms and floats in smoothly across entry
        if (s2ParagraphRef.current) {
          gsap.fromTo(
            s2ParagraphRef.current,
            { y: 80, opacity: 0, scale: 0.90 },
            {
              y: 0,
              opacity: 1,
              scale: 1,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: screen2Ref.current,
                start: 'top 85%',
                end: 'top top',
                scrub: 1.2,
              },
            }
          );
        }

        // B. Left stat slides from left, right stat slides from right
        if (s2StatLeftRef.current) {
          gsap.fromTo(
            s2StatLeftRef.current,
            { x: -70, opacity: 0 },
            {
              x: 0,
              opacity: 1,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: screen2Ref.current,
                start: 'top 80%',
                end: 'top top',
                scrub: 1.3,
              },
            }
          );
        }

        if (s2StatRightRef.current) {
          gsap.fromTo(
            s2StatRightRef.current,
            { x: 70, opacity: 0 },
            {
              x: 0,
              opacity: 1,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: screen2Ref.current,
                start: 'top 80%',
                end: 'top top',
                scrub: 1.3,
              },
            }
          );
        }

        // C. 6 Peripheral apertures expansion
        if (s2ApertureRef.current) {
          gsap.fromTo(
            s2ApertureRef.current,
            { scale: 0.90, opacity: 0.4 },
            {
              scale: 1,
              opacity: 1,
              ease: 'power1.out',
              scrollTrigger: {
                trigger: screen2Ref.current,
                start: 'top 90%',
                end: 'top top',
                scrub: 1.4,
              },
            }
          );
        }
      }

      // =======================================================================
      // 3. SCREEN 3 SCROLL-BASED ENTRY ANIMATION
      // =======================================================================
      if (screen3Ref.current) {
        // A. 4 bold hope-filled lines stagger in from below across entry
        const s3Lines = s3HeadlineRef.current?.querySelectorAll('.hope-line');
        if (s3Lines && s3Lines.length > 0) {
          gsap.fromTo(
            s3Lines,
            {
              y: (i) => 80 + i * 25,
              opacity: 0,
              x: 35,
            },
            {
              y: 0,
              opacity: 1,
              x: 0,
              ease: 'power2.out',
              stagger: 0.1,
              scrollTrigger: {
                trigger: screen3Ref.current,
                start: 'top 85%',
                end: 'top top',
                scrub: 1.2,
              },
            }
          );
        }

        // B. Top apertures reveal
        if (s3ApertureRef.current) {
          gsap.fromTo(
            s3ApertureRef.current,
            { scale: 0.92, opacity: 0.5 },
            {
              scale: 1,
              opacity: 1,
              ease: 'power1.out',
              scrollTrigger: {
                trigger: screen3Ref.current,
                start: 'top 90%',
                end: 'top top',
                scrub: 1.4,
              },
            }
          );
        }
      }
    },
    { scope: containerRef }
  );

  return (
    <section
      id="platform-section"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full bg-[#070707] text-white z-30 font-sans border-t border-neutral-800/80 shadow-[0_-50px_100px_rgba(0,0,0,0.98)] select-none overflow-hidden"
    >
      {/* ========================================================================= */}
      {/* SCREEN 1: THE URGENT TRUTH */}
      {/* ========================================================================= */}
      <div
        ref={screen1Ref}
        className="relative w-full h-screen px-6 sm:px-12 md:px-16 lg:px-24 py-12 md:py-16 flex flex-col justify-between overflow-hidden bg-[#070707]"
      >
        {/* Dim Ambient Video Base with vertical edge vignette */}
        <div
          className="absolute inset-0 z-0 opacity-15 mix-blend-luminosity pointer-events-none"
          style={{
            maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
          }}
        >
          <video
            src={VIDEO_BEAT_1}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover object-center filter grayscale contrast-140 brightness-35"
          />
        </div>

        {/* High-Clarity Video in Screen 1 Apertures */}
        <div
          ref={s1ApertureRef}
          className="absolute inset-0 z-1 pointer-events-none overflow-hidden"
          style={{
            maskImage: `
              radial-gradient(ellipse 260px 380px at 78% 38%, black 20%, rgba(0,0,0,0.7) 48%, transparent 75%),
              radial-gradient(ellipse 220px 280px at 15% 72%, black 18%, rgba(0,0,0,0.6) 45%, transparent 68%),
              radial-gradient(ellipse 160px 200px at 8% 28%, black 15%, transparent 65%),
              radial-gradient(ellipse 170px 220px at 88% 80%, black 15%, transparent 65%),
              radial-gradient(circle 220px at ${mousePos.x}% ${mousePos.y}%, rgba(0,0,0,0.8) 0%, transparent 75%)
            `,
            WebkitMaskImage: `
              radial-gradient(ellipse 260px 380px at 78% 38%, black 20%, rgba(0,0,0,0.7) 48%, transparent 75%),
              radial-gradient(ellipse 220px 280px at 15% 72%, black 18%, rgba(0,0,0,0.6) 45%, transparent 68%),
              radial-gradient(ellipse 160px 200px at 8% 28%, black 15%, transparent 65%),
              radial-gradient(ellipse 170px 220px at 88% 80%, black 15%, transparent 65%),
              radial-gradient(circle 220px at ${mousePos.x}% ${mousePos.y}%, rgba(0,0,0,0.8) 0%, transparent 75%)
            `,
          }}
        >
          <video
            src={VIDEO_BEAT_1}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover object-center filter grayscale contrast-135 brightness-110"
          />
        </div>

        {/* Film grain overlay */}
        <div className="absolute inset-0 bg-[#070707]/20 z-2 pointer-events-none" />

        {/* Bottom seam joint cover gradient */}
        <div className="absolute bottom-0 inset-x-0 h-36 md:h-48 bg-gradient-to-t from-[#070707] via-[#070707]/80 to-transparent pointer-events-none z-3" />

        {/* Content */}
        <div className="relative max-w-[1360px] mx-auto z-10 w-full flex-1 flex flex-col justify-between pt-2 sm:pt-4">
          
          <div ref={s1HeadlineRef} className="max-w-xl">
            <div className="staircase-line flex items-baseline gap-3 sm:gap-4 mb-0.5">
              <div className="font-mono text-[8px] sm:text-[9px] text-neutral-400 font-bold tracking-widest uppercase leading-tight shrink-0 max-w-[125px] sm:max-w-[145px] pb-0.5">
                <div>THIS IS THE CRISIS IN</div>
                <div className="text-neutral-500">AFRICAN MATERNAL CARE</div>
              </div>
              
              <h2 className="font-sans font-black text-xl sm:text-2xl md:text-3xl lg:text-[2.1rem] xl:text-[2.35rem] text-white tracking-[-0.03em] leading-[0.95] uppercase drop-shadow-md">
                ACCESSIBLE HEALTHCARE IS THE
              </h2>
            </div>

            <div className="staircase-line mb-0.5">
              <h2 className="font-sans font-black text-xl sm:text-2xl md:text-3xl lg:text-[2.1rem] xl:text-[2.35rem] text-white tracking-[-0.03em] leading-[0.95] uppercase drop-shadow-md">
                REASON OUR MOTHERS
              </h2>
            </div>

            <div className="staircase-line mb-0.5">
              <h2 className="font-sans font-black text-xl sm:text-2xl md:text-3xl lg:text-[2.1rem] xl:text-[2.35rem] text-white tracking-[-0.03em] leading-[0.95] uppercase drop-shadow-md">
                AND DAUGHTERS
              </h2>
            </div>

            <div className="staircase-line pl-[12%] sm:pl-[16%] md:pl-[20%] mb-0.5">
              <h2 className="font-sans font-black text-xl sm:text-2xl md:text-3xl lg:text-[2.1rem] xl:text-[2.35rem] text-white tracking-[-0.03em] leading-[0.95] uppercase drop-shadow-md">
                ARE HEALTHY &amp;
              </h2>
            </div>

            <div className="staircase-line pl-[24%] sm:pl-[30%] md:pl-[36%]">
              <h2 className="font-sans font-black text-xl sm:text-2xl md:text-3xl lg:text-[2.1rem] xl:text-[2.35rem] text-white tracking-[-0.03em] leading-[0.95] uppercase drop-shadow-md">
                THRIVING ACROSS
              </h2>
            </div>
          </div>

          {/* Right Word Floating in Space */}
          <div
            ref={s1GenerationsRef}
            className="absolute right-0 sm:right-6 md:right-12 lg:right-16 top-[42%] md:top-[44%] -translate-y-1/2 select-none pointer-events-none z-20"
          >
            <span className="font-sans font-black text-xl sm:text-2xl md:text-3xl lg:text-[2.1rem] xl:text-[2.35rem] text-white tracking-[-0.03em] uppercase drop-shadow-2xl opacity-95">
              GENERATIONS
            </span>
          </div>

          {/* Bottom Callouts */}
          <div className="pt-8 sm:pt-12 grid grid-cols-1 sm:grid-cols-12 gap-6 items-end pb-2">
            <div ref={s1StatLeftRef} className="sm:col-span-6 md:col-span-5 sm:col-start-4 md:col-start-4 font-mono space-y-1">
              <div className="text-[10px] font-bold text-neutral-300 tracking-wider uppercase flex items-center gap-1.5">
                <span>•</span>
                <span>MATERNAL TELEMEDICINE</span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-neutral-400">
                15 000+ (ACTIVE CLINICAL
              </div>
              <div className="text-[10px] text-neutral-500 tracking-wider">
                SESSIONS CONDUCTED)
              </div>
            </div>

            <div ref={s1StatRightRef} className="sm:col-span-5 md:col-span-4 sm:col-start-7 md:col-start-8 text-left sm:text-right font-mono space-y-1 transform sm:translate-y-4 md:translate-y-6 sm:-translate-x-4 md:-translate-x-8">
              <div className="text-[10px] font-bold text-neutral-300 tracking-wider uppercase flex items-center justify-start sm:justify-end gap-1.5">
                <span>FERTILITY PRECISION</span>
                <span>•</span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-neutral-400">
                98.4% (CYCLE PREDICTION
              </div>
              <div className="text-[10px] text-neutral-500 tracking-wider">
                ACCURACY RATE)
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* SCREEN 2: THE HUMANITARIAN REALITY */}
      {/* ========================================================================= */}
      <div
        ref={screen2Ref}
        className="relative w-full h-screen px-6 sm:px-12 md:px-16 lg:px-24 py-12 md:py-16 flex flex-col justify-between items-center overflow-hidden bg-[#070707]"
      >
        {/* Top & Bottom seam joint cover gradients */}
        <div className="absolute top-0 inset-x-0 h-36 md:h-48 bg-gradient-to-b from-[#070707] via-[#070707]/80 to-transparent pointer-events-none z-3" />
        <div className="absolute bottom-0 inset-x-0 h-36 md:h-48 bg-gradient-to-t from-[#070707] via-[#070707]/80 to-transparent pointer-events-none z-3" />

        {/* Dim Ambient Video Base with vertical edge vignette */}
        <div
          className="absolute inset-0 z-0 opacity-15 mix-blend-luminosity pointer-events-none"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
          }}
        >
          <video
            src={VIDEO_BEAT_2}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover object-center filter grayscale contrast-140 brightness-35"
          />
        </div>

        {/* 6 Peripheral Spotlight Apertures for Screen 2 */}
        <div
          ref={s2ApertureRef}
          className="absolute inset-0 z-1 pointer-events-none overflow-hidden"
          style={{
            maskImage: `
              radial-gradient(circle 150px at 16% 24%, black 20%, rgba(0,0,0,0.7) 45%, transparent 68%),
              radial-gradient(circle 160px at 84% 22%, black 20%, rgba(0,0,0,0.7) 45%, transparent 68%),
              radial-gradient(circle 170px at 10% 54%, black 20%, rgba(0,0,0,0.7) 45%, transparent 68%),
              radial-gradient(circle 170px at 90% 50%, black 20%, rgba(0,0,0,0.7) 45%, transparent 68%),
              radial-gradient(circle 130px at 28% 76%, black 15%, rgba(0,0,0,0.6) 40%, transparent 65%),
              radial-gradient(circle 130px at 72% 76%, black 15%, rgba(0,0,0,0.6) 40%, transparent 65%),
              radial-gradient(circle 200px at ${mousePos.x}% ${mousePos.y}%, rgba(0,0,0,0.8) 0%, transparent 75%)
            `,
            WebkitMaskImage: `
              radial-gradient(circle 150px at 16% 24%, black 20%, rgba(0,0,0,0.7) 45%, transparent 68%),
              radial-gradient(circle 160px at 84% 22%, black 20%, rgba(0,0,0,0.7) 45%, transparent 68%),
              radial-gradient(circle 170px at 10% 54%, black 20%, rgba(0,0,0,0.7) 45%, transparent 68%),
              radial-gradient(circle 170px at 90% 50%, black 20%, rgba(0,0,0,0.7) 45%, transparent 68%),
              radial-gradient(circle 130px at 28% 76%, black 15%, rgba(0,0,0,0.6) 40%, transparent 65%),
              radial-gradient(circle 130px at 72% 76%, black 15%, rgba(0,0,0,0.6) 40%, transparent 65%),
              radial-gradient(circle 200px at ${mousePos.x}% ${mousePos.y}%, rgba(0,0,0,0.8) 0%, transparent 75%)
            `,
          }}
        >
          <video
            src={VIDEO_BEAT_2}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover object-center filter grayscale contrast-135 brightness-110"
          />
        </div>

        {/* Film grain overlay */}
        <div className="absolute inset-0 bg-[#070707]/20 z-2 pointer-events-none" />

        {/* Centered Editorial Content */}
        <div className="relative max-w-xl mx-auto z-10 text-center my-auto px-4">
          <div ref={s2ParagraphRef}>
            <p className="text-xs sm:text-sm md:text-base text-neutral-200 font-sans leading-relaxed tracking-wide max-w-lg mx-auto">
              Over 68% of women across Sub-Saharan Africa lack timely access to certified reproductive specialists, leading to preventable maternal complications and silent struggles with fertility. Red Apple bridges this critical gap.
            </p>
          </div>
        </div>

        {/* Peripheral Data Left & Right */}
        <div className="relative max-w-5xl mx-auto z-10 w-full flex justify-between items-center px-4 pb-2">
          <div ref={s2StatLeftRef} className="font-mono space-y-0.5">
            <div className="text-[10px] sm:text-[11px] font-bold text-neutral-300 tracking-wider uppercase flex items-center gap-1.5">
              <span>•</span>
              <span>MATERNAL MORTALITY DEFICIT</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-neutral-400">
              1 IN 22 LIFETIME RISK
            </div>
          </div>

          <div ref={s2StatRightRef} className="font-mono space-y-0.5 text-right">
            <div className="text-[10px] sm:text-[11px] font-bold text-neutral-300 tracking-wider uppercase flex items-center justify-end gap-1.5">
              <span>RURAL CLINICAL GAP</span>
              <span>•</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-neutral-400">
              62% UNMET ACCESS
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SCREEN 3: THE RALLYING CRY */}
      {/* ========================================================================= */}
      <div
        ref={screen3Ref}
        className="relative w-full h-screen px-6 sm:px-12 md:px-16 lg:px-24 py-12 md:py-16 flex flex-col justify-end overflow-hidden bg-[#070707]"
      >
        {/* Top seam joint cover gradient */}
        <div className="absolute top-0 inset-x-0 h-36 md:h-48 bg-gradient-to-b from-[#070707] via-[#070707]/80 to-transparent pointer-events-none z-3" />

        {/* Dim Ambient Video Base with vertical edge vignette */}
        <div
          className="absolute inset-0 z-0 opacity-15 mix-blend-luminosity pointer-events-none"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 100%)',
          }}
        >
          <video
            src={VIDEO_BEAT_3}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover object-center filter grayscale contrast-140 brightness-35"
          />
        </div>

        {/* Top/Ambient Apertures for Screen 3 with soft bottom drop-offs */}
        <div
          ref={s3ApertureRef}
          className="absolute inset-0 z-1 pointer-events-none overflow-hidden"
          style={{
            maskImage: `
              radial-gradient(ellipse 260px 220px at 18% 28%, black 20%, rgba(0,0,0,0.7) 45%, transparent 68%),
              radial-gradient(ellipse 300px 240px at 50% 24%, black 20%, rgba(0,0,0,0.7) 45%, transparent 68%),
              radial-gradient(circle 200px at ${mousePos.x}% ${mousePos.y}%, rgba(0,0,0,0.8) 0%, transparent 75%)
            `,
            WebkitMaskImage: `
              radial-gradient(ellipse 260px 220px at 18% 28%, black 20%, rgba(0,0,0,0.7) 45%, transparent 68%),
              radial-gradient(ellipse 300px 240px at 50% 24%, black 20%, rgba(0,0,0,0.7) 45%, transparent 68%),
              radial-gradient(circle 200px at ${mousePos.x}% ${mousePos.y}%, rgba(0,0,0,0.8) 0%, transparent 75%)
            `,
          }}
        >
          <video
            src={VIDEO_BEAT_3}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover object-center filter grayscale contrast-135 brightness-110"
          />
        </div>

        {/* Film grain overlay */}
        <div className="absolute inset-0 bg-[#070707]/20 z-2 pointer-events-none" />

        {/* Bottom-Right Refined Hope-Filled Typography */}
        <div className="relative max-w-7xl mx-auto z-10 w-full flex justify-end pb-12 sm:pb-20">
          <div ref={s3HeadlineRef} className="text-right space-y-0.5 max-w-2xl">
            <div className="hope-line">
              <h2 className="font-sans font-black text-2xl sm:text-3xl md:text-4xl lg:text-[2.6rem] xl:text-[3rem] text-neutral-400 tracking-[-0.03em] leading-[0.94] uppercase">
                FOR EVERY MOTHER.
              </h2>
            </div>

            <div className="hope-line">
              <h2 className="font-sans font-black text-2xl sm:text-3xl md:text-4xl lg:text-[2.6rem] xl:text-[3rem] text-white tracking-[-0.03em] leading-[0.94] uppercase">
                FOR EVERY DAUGHTER.
              </h2>
            </div>

            <div className="hope-line">
              <h2 className="font-sans font-black text-2xl sm:text-3xl md:text-4xl lg:text-[2.6rem] xl:text-[3rem] text-white tracking-[-0.03em] leading-[0.94] uppercase">
                A FUTURE
              </h2>
            </div>

            <div className="hope-line">
              <h2 className="font-sans font-black text-2xl sm:text-3xl md:text-4xl lg:text-[2.6rem] xl:text-[3rem] text-white tracking-[-0.03em] leading-[0.94] uppercase">
                FILLED WITH HOPE.
              </h2>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
