import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { TornPaperEdge } from './TornPaperEdge';

gsap.registerPlugin(ScrollTrigger);

interface HeroSectionProps {
  brandName?: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  brandName = 'RED APPLE',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftHeadlineRef = useRef<HTMLDivElement>(null);
  const rightHeadlineRef = useRef<HTMLDivElement>(null);
  const bottomBannerRef = useRef<HTMLDivElement>(null);

  const splitPercent = 50.0;

  useGSAP(
    () => {
      if (!containerRef.current) return;

      // Unified single ScrollTrigger: Pins the hero AND scrubs text animation together
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: '+=100%',
          pin: true,
          pinSpacing: false,
          scrub: 0.6,
        },
      });

      tl.to(
        leftHeadlineRef.current,
        {
          x: -180,
          opacity: 0,
          ease: 'power1.out',
        },
        0
      )
        .to(
          rightHeadlineRef.current,
          {
            x: 180,
            opacity: 0,
            ease: 'power1.out',
          },
          0
        )
        .to(
          bottomBannerRef.current,
          {
            y: 100,
            opacity: 0,
            ease: 'power1.out',
          },
          0
        );
    },
    { scope: containerRef }
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen min-h-[640px] overflow-hidden select-none bg-neutral-950 flex items-center justify-center font-sans z-10"
    >
      {/* ========================================================================= */}
      {/* 1. DUAL FULLSCREEN BACKGROUND & USER HERO IMAGE COMPOSITION (LOCKED) */}
      {/* ========================================================================= */}

      {/* A. RIGHT HALF: Concrete Studio Grunge Background + Monochrome Image */}
      <div
        className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-gradient-to-br from-[#B8BBBE] via-[#9DA0A4] to-[#808489]"
        style={{
          clipPath: `polygon(${splitPercent}% 0, 100% 0, 100% 100%, ${splitPercent}% 100%)`,
        }}
      >
        {/* Subtle noise/grain texture on right */}
        <div className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none bg-[radial-gradient(circle_at_75%_35%,rgba(255,255,255,0.4)_0%,transparent_60%)]" />

        {/* Exact same image: rendered in monochrome and blended with concrete */}
        <img
          src="/red-apple-family.jpg"
          alt="Red Apple Hero Monochrome"
          className="w-full h-full object-cover object-center filter grayscale contrast-130 brightness-95 mix-blend-multiply pointer-events-none"
          draggable={false}
        />
      </div>

      {/* B. LEFT HALF: Pure Solid White Canvas + Exact Same Image in Vivid Color */}
      <div
        className="absolute inset-0 w-full h-full z-5 overflow-hidden bg-white shadow-2xl transition-[clip-path] duration-75 ease-out"
        style={{
          clipPath: `polygon(0 0, ${splitPercent}% 0, ${splitPercent}% 100%, 0 100%)`,
        }}
      >
        {/* Exact same image: rendered in full natural color on pure white */}
        <img
          src="/red-apple-family.jpg"
          alt="Red Apple Hero Color"
          className="w-full h-full object-cover object-center filter saturate-105 contrast-105 pointer-events-none"
          draggable={false}
        />
      </div>

      {/* ========================================================================= */}
      {/* 2. TORN PAPER RIPPED EDGE SVG SHADOW & FIBERS (LOCKED) */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 z-15 pointer-events-none">
        <TornPaperEdge splitPercent={splitPercent} />
      </div>

      {/* ========================================================================= */}
      {/* 3. EDITORIAL TYPOGRAPHY & PRECISE PLACEMENT */}
      {/* ========================================================================= */}

      {/* A. Left Headline: RED APPLE (Upper-left quadrant on white canvas) */}
      <div
        ref={leftHeadlineRef}
        className="absolute left-6 sm:left-8 md:left-10 lg:left-14 top-[16%] md:top-[18%] z-25 pointer-events-none max-w-[32%]"
      >
        <h1 className="font-display font-normal text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-neutral-950 tracking-tight leading-[0.88] uppercase drop-shadow-xs">
          {brandName}
        </h1>
      </div>

      {/* B. Right Headline: DEDICATED TO YOUR WELL-BEING (Vertically centered on grey concrete) */}
      <div
        ref={rightHeadlineRef}
        className="absolute right-6 sm:right-8 md:right-10 lg:right-14 top-1/2 -translate-y-1/2 z-25 text-right pointer-events-none max-w-[34%] flex flex-col items-end"
      >
        <div className="font-display font-normal text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl text-neutral-950 tracking-tight leading-[0.88] text-right uppercase drop-shadow-xs">
          <div>DEDICATED TO</div>
          <div>YOUR WELL-BEING</div>
        </div>
      </div>

      {/* C. Bottom Spanning Statement: YOUR PARTNER IN HEALTH (High Contrast Red / White Split) */}
      <div
        ref={bottomBannerRef}
        className="absolute bottom-2 sm:bottom-3 md:bottom-4 left-0 right-0 z-30 pointer-events-none px-4 flex justify-center"
      >
        <div className="relative w-full max-w-[1700px] text-center">
          {/* Base Layer: Crisp Pure White Text on Concrete Grey */}
          <div className="w-full text-center select-none">
            <span className="font-display font-normal text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[5.5rem] 2xl:text-[6rem] text-white tracking-tight leading-none whitespace-nowrap block drop-shadow-md uppercase">
              YOUR PARTNER IN HEALTH
            </span>
          </div>

          {/* Top Layer: Vibrant Crimson Red Text on Pure White */}
          <div
            className="absolute inset-0 w-full text-center select-none transition-[clip-path] duration-75"
            style={{
              clipPath: `polygon(0 0, ${splitPercent}% 0, ${splitPercent}% 100%, 0 100%)`,
            }}
          >
            <span className="font-display font-normal text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[5.5rem] 2xl:text-[6rem] text-crimson tracking-tight leading-none whitespace-nowrap block uppercase">
              YOUR PARTNER IN HEALTH
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
