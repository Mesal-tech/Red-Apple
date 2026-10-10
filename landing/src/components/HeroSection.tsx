import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ArrowDown } from 'lucide-react';
import { KineticHeroText } from './KineticHeroText';

interface HeroSectionProps {
  brandName?: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  brandName: _brandName = 'RED APPLE',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const kickerRef = useRef<HTMLParagraphElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const logosRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.from(kickerRef.current, {
        y: 20,
        opacity: 0,
        duration: 0.7,
      })
        .from(
          headlineRef.current,
          {
            y: 35,
            opacity: 0,
            duration: 0.9,
          },
          '-=0.4'
        )
        .from(
          ctaRef.current,
          {
            y: 15,
            opacity: 0,
            duration: 0.6,
          },
          '-=0.4'
        )
        .from(
          logosRef.current,
          {
            opacity: 0,
            y: 15,
            duration: 0.8,
          },
          '-=0.3'
        );
    },
    { scope: containerRef }
  );

  const scrollToContent = () => {
    const target =
      document.querySelector('#intro') ||
      document.querySelector('#mission') ||
      document.querySelector('#products');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      ref={containerRef}
      className="relative w-full min-h-[calc(100vh-20px)] bg-white text-neutral-950 flex flex-col justify-between items-center px-6 sm:px-10 lg:px-14 pt-32 sm:pt-36 pb-10 overflow-hidden"
    >
      {/* 1. Center Hero Block: Kicker + Perfectly Sized Headline + Squiggle CTA */}
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-5xl mx-auto my-auto w-full py-5 sm:py-10">
        
        {/* Kicker (Direct from Page 1 of Pre-Seed Pitch Deck) */}
        <p
          ref={kickerRef}
          className="font-serif italic sm:not-italic font-normal text-base sm:text-lg text-neutral-600 tracking-tight leading-snug mb-3 sm:mb-4 max-w-md mx-auto"
        >
          Reproductive &amp; preventive healthcare,
          <br className="hidden sm:inline" /> built for African women
        </p>

        {/* Main Headline with Extrafazant-Style GSAP Kinetic Hover Effect */}
        <KineticHeroText
          line1="TRANSFORMING REPRODUCTIVE"
          line2Sans="HEALTH"
          line2Serif="IN AFRICA"
          headingRef={headlineRef}
        />

        {/* CTA with Downward Arrow Button & Wavy Squiggle Underline */}
        <div ref={ctaRef} className="mt-7 sm:mt-10 flex flex-col items-center">
          <button
            onClick={scrollToContent}
            className="group flex flex-col items-center cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
            aria-label="Discover more about Red Apple"
          >
            <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-neutral-900 tracking-tight">
              <span>Discover more</span>
              <span className="w-5 h-5 rounded-xs bg-crimson text-white flex items-center justify-center transition-transform group-hover:translate-y-0.5 shadow-2xs">
                <ArrowDown className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* Playful Wavy Squiggle SVG Underline in Red Apple Crimson */}
            <svg
              className="w-28 sm:w-32 h-3 mt-1 text-crimson overflow-visible"
              viewBox="0 0 120 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2 6C12 2 18 10 28 6C38 2 44 10 54 6C64 2 70 10 80 6C90 2 96 10 106 6C112 3.6 116 5 118 6"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

      </div>

      {/* 2. Partner / Clinical Network Logo Strip across the bottom of the hero */}
      <div
        ref={logosRef}
        className="w-full max-w-7xl mx-auto pt-8 pb-2 border-t border-neutral-100"
      >
        <div className="flex flex-wrap items-center justify-center sm:justify-between gap-6 sm:gap-8 md:gap-10 opacity-85 hover:opacity-100 transition-opacity">
          
          {/* Badge 1: MDCN Verified */}
          <div className="flex items-center gap-2 text-neutral-900 font-bold tracking-tight">
            <span className="w-6 h-6 rounded-full border-2 border-neutral-900 flex items-center justify-center text-[10px] font-black text-crimson">✚</span>
            <span className="text-xs sm:text-sm font-sans tracking-wide">MDCN VERIFIED DOCTORS</span>
          </div>

          {/* Badge 2: NDPC Compliant */}
          <div className="flex items-center gap-2 text-neutral-900 font-bold">
            <svg className="w-5 h-5 text-crimson" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" />
            </svg>
            <span className="text-xs sm:text-sm font-sans">NDPC DATA COMPLIANT</span>
          </div>

          {/* Badge 3: AI-Assisted Triage */}
          <div className="flex items-center gap-1.5 text-neutral-900 font-bold text-xs sm:text-sm tracking-tight font-sans">
            <span className="text-[10px] font-mono font-bold bg-neutral-950 text-white px-1.5 py-0.5 rounded">AI</span>
            <span>CLINICAL SYMPTOM ANALYSIS</span>
          </div>

          {/* Badge 4: Localized Affordability */}
          <div className="flex items-center gap-2 text-neutral-900 font-bold text-xs sm:text-sm">
            <span className="font-extrabold text-crimson text-sm">₦1,999/mo</span>
            <span className="text-neutral-600 font-medium font-sans">Accessible Tier</span>
          </div>

          {/* Badge 5: African Addressable Market */}
          <div className="flex items-center gap-1.5 text-neutral-900 font-bold text-xs sm:text-sm tracking-tight">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>325M AFRICAN TAM</span>
          </div>

        </div>
      </div>
    </section>
  );
};
