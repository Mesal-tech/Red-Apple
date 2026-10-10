import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ArrowRigh } from 'lucide-react';

export const IntroMissionSection: React.FC = () => {
  const containerRef = useRef<HTMLElement>(null);
  const collageRef = useRef<HTMLDivElement>(null);
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const sticker1Ref = useRef<HTMLDivElement>(null);
  const sticker2Ref = useRef<HTMLDivElement>(null);
  const sticker3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const collage = collageRef.current;
    if (!collage) return;

    // Only apply physics on desktop with fine pointers
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!canHover || prefersReducedMotion) return;

    // GSAP quickTo tweens for buttery smooth physics
    const card1X = gsap.quickTo(card1Ref.current, 'x', { duration: 0.8, ease: 'power3.out' });
    const card1Y = gsap.quickTo(card1Ref.current, 'y', { duration: 0.8, ease: 'power3.out' });
    const card1R = gsap.quickTo(card1Ref.current, 'rotation', { duration: 0.8, ease: 'power3.out' });

    const card2X = gsap.quickTo(card2Ref.current, 'x', { duration: 0.7, ease: 'power3.out' });
    const card2Y = gsap.quickTo(card2Ref.current, 'y', { duration: 0.7, ease: 'power3.out' });
    const card2R = gsap.quickTo(card2Ref.current, 'rotation', { duration: 0.7, ease: 'power3.out' });

    const s1X = gsap.quickTo(sticker1Ref.current, 'x', { duration: 0.5, ease: 'power2.out' });
    const s1Y = gsap.quickTo(sticker1Ref.current, 'y', { duration: 0.5, ease: 'power2.out' });

    const s2X = gsap.quickTo(sticker2Ref.current, 'x', { duration: 0.6, ease: 'power2.out' });
    const s2Y = gsap.quickTo(sticker2Ref.current, 'y', { duration: 0.6, ease: 'power2.out' });

    const s3X = gsap.quickTo(sticker3Ref.current, 'x', { duration: 0.55, ease: 'power2.out' });
    const s3Y = gsap.quickTo(sticker3Ref.current, 'y', { duration: 0.55, ease: 'power2.out' });

    const handleMouseMove = (e: MouseEvent) => {
      const rect = collage.getBoundingClientRect();
      const relX = e.clientX - (rect.left + rect.width / 2);
      const relY = e.clientY - (rect.top + rect.height / 2);

      // Subtle natural parallax offsets
      card1X(relX * 0.035);
      card1Y(relY * 0.035);
      card1R(-5 + relX * 0.015);

      card2X(relX * -0.04);
      card2Y(relY * -0.04);
      card2R(6 - relX * 0.02);

      s1X(relX * 0.07);
      s1Y(relY * 0.07);

      s2X(relX * -0.055);
      s2Y(relY * -0.055);

      s3X(relX * 0.06);
      s3Y(relY * 0.06);
    };

    const handleMouseLeave = () => {
      card1X(0);
      card1Y(0);
      card1R(-5);

      card2X(0);
      card2Y(0);
      card2R(6);

      s1X(0);
      s1Y(0);

      s2X(0);
      s2Y(0);

      s3X(0);
      s3Y(0);
    };

    collage.addEventListener('mousemove', handleMouseMove);
    collage.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      collage.removeEventListener('mousemove', handleMouseMove);
      collage.removeEventListener('mouseleave', handleMouseLeave);
      gsap.killTweensOf([
        card1Ref.current,
        card2Ref.current,
        sticker1Ref.current,
        sticker2Ref.current,
        sticker3Ref.current,
      ]);
    };
  }, []);

  return (
    <section
      ref={containerRef}
      id="intro"
      className="relative w-full bg-white text-neutral-900 py-20 sm:py-28 md:py-36 px-6 sm:px-10 lg:px-16 overflow-hidden border-t border-neutral-100"
    >
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-16 lg:gap-12">

        {/* LEFT COLUMN: Extrafazant Interactive Polaroid & Die-Cut Sticker Collage */}
        <div
          ref={collageRef}
          className="w-full lg:w-1/2 relative min-h-[380px] sm:min-h-[440px] md:min-h-[480px] flex items-center justify-center select-none"
        >
          {/* Polaroid 1 (Left Back): Lagos Medical Studio / Clinical Team */}
          <div
            ref={card1Ref}
            className="absolute left-2 sm:left-6 md:left-8 top-2 sm:top-4 w-52 sm:w-60 md:w-68 bg-white p-2.5 sm:p-3 pb-6 sm:pb-8 shadow-[0_15px_35px_rgba(0,0,0,0.1)] border border-neutral-100/90 rounded-xs transition-shadow duration-300 hover:shadow-[0_25px_50px_rgba(0,0,0,0.16)] z-10 cursor-pointer"
            style={{ transform: 'rotate(-5deg)' }}
          >
            <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100 flex items-center justify-center">
              {/* Blank Placeholder */}
              <div className="w-full h-full bg-neutral-200" />
            </div>
          </div>

          {/* Polaroid 2 (Right Front): Apparel / Outreach Kit */}
          <div
            ref={card2Ref}
            className="absolute right-2 sm:right-6 md:right-8 bottom-2 sm:bottom-4 w-46 sm:w-54 md:w-62 bg-white p-2.5 sm:p-3 pb-6 sm:pb-8 shadow-[0_20px_45px_rgba(0,0,0,0.13)] border border-neutral-100/90 rounded-xs transition-shadow duration-300 hover:shadow-[0_30px_60px_rgba(0,0,0,0.2)] z-20 cursor-pointer"
            style={{ transform: 'rotate(6deg)' }}
          >
            <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100 flex items-center justify-center">
              {/* Blank Placeholder */}
              <div className="w-full h-full bg-neutral-200" />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Editorial Story & Clean Action Trigger */}
        <div className="w-full lg:w-1/2 flex flex-col items-start lg:pl-6 text-left">

          {/* Eyebrow Kicker ("Wie wij zijn" style - delicate label) */}
          <p className="font-editorial italic text-base sm:text-lg text-neutral-800 tracking-tight mb-2">
            Who we are
          </p>

          {/* High-Impact Headline ("DE CREATIVES VAN EXTRAFAZANT" style - balanced scale) */}
          <h2 className="text-2xl sm:text-3xl lg:text-[38px] font-extrabold uppercase tracking-tight text-neutral-950 leading-[1.04] mb-4">
            <span className="block font-sans font-extrabold">
              THE CLINICIANS &amp;
            </span>
            <span className="block font-editorial font-normal italic text-neutral-950 mt-0.5">
              MINDS OF RED APPLE
            </span>
          </h2>

          {/* Crisp, Direct Description - Compact reading scale */}
          <p className="font-sans text-sm sm:text-base text-neutral-600 leading-relaxed font-normal max-w-md mb-6">
            No bloated hospital queues. No silence, shame, or outdated advice. We are a multidisciplinary collective of MDCN-verified OBGYNs, fertility specialists, and AI engineers delivering culturally competent reproductive care directly into African women's hands.
          </p>

          {/* Compact Action Button with Arrow (Extrafazant style) */}
          <a
            href="/about"
            className="group inline-flex items-center gap-2.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xs shadow-xs transition-all duration-200 hover:-translate-y-0.5"
            aria-label="Learn more about Red Apple's team and mission"
          >
            <span className="w-4 h-4 rounded-xs bg-white/20 flex items-center justify-center transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="w-3 h-3 text-white" />
            </span>
            <span>MORE ABOUT US</span>
          </a>

        </div>

      </div>
    </section>
  );
};
