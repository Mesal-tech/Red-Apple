import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Globe } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export const ImpactSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const card0Ref = useRef<HTMLDivElement>(null);
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    const root = rootRef.current;
    const c0 = card0Ref.current;
    const c1 = card1Ref.current;
    const c2 = card2Ref.current;

    if (!section || !pin || !root || !c0 || !c1 || !c2) return;

    const cards = [c0, c1, c2];
    const depth = 60; // z-axis distance between cards
    const yOffset = 16; // vertical peek offset

    // Set initial 3D positions
    cards.forEach((card, idx) => {
      gsap.set(card, {
        z: -idx * depth,
        y: -idx * yOffset,
        zIndex: cards.length - idx,
        autoAlpha: 1,
        transformOrigin: 'center center',
      });
    });

    const tl = gsap.timeline({ paused: true });

    // 1. As user scrolls down: Card 0 leaves the screen DOWNWARDS
    tl.to(c0, {
      y: () => `+=${window.innerHeight * 0.85}`,
      ease: 'power2.in',
      duration: 1,
    }, 0);
    tl.to(c0, {
      autoAlpha: 0,
      duration: 0.25,
      ease: 'none',
    }, 0.7);

    // Remaining cards step forward in 3D stack
    tl.to(c1, { z: 0, y: 0, duration: 1, ease: 'none' }, 0);
    tl.to(c2, { z: -depth, y: -yOffset, duration: 1, ease: 'none' }, 0);

    // 2. Next scroll step: Card 1 leaves the screen DOWNWARDS
    tl.to(c1, {
      y: () => `+=${window.innerHeight * 0.85}`,
      ease: 'power2.in',
      duration: 1,
    }, 1);
    tl.to(c1, {
      autoAlpha: 0,
      duration: 0.25,
      ease: 'none',
    }, 1.7);

    // Card 2 moves to the very front
    tl.to(c2, { z: 0, y: 0, duration: 1, ease: 'none' }, 1);

    // Continuous rotation of the circular scroll stamp badge
    if (badgeRef.current) {
      tl.fromTo(badgeRef.current, { rotation: 0 }, { rotation: 360, ease: 'none', duration: 2 }, 0);
    }

    // ScrollTrigger to pin the section and scrub the timeline
    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: () => `+=${window.innerHeight * 2.2}`,
      pin: pin,
      pinSpacing: true,
      scrub: 0.3,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        tl.progress(self.progress);
      },
    });

    // 3D Mouse Parallax Tilt on desktop
    let cleanupMouse: (() => void) | undefined;
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      const tiltX = gsap.quickTo(root, 'rotationX', { duration: 0.6, ease: 'power3.out' });
      const tiltY = gsap.quickTo(root, 'rotationY', { duration: 0.6, ease: 'power3.out' });

      const onMouseMove = (e: MouseEvent) => {
        const rect = pin.getBoundingClientRect();
        const qX = (e.clientX - rect.left) / rect.width - 0.5;
        const qY = (e.clientY - rect.top) / rect.height - 0.5;
        tiltX(-qY * 6);
        tiltY(qX * 8);
      };

      const onMouseLeave = () => {
        tiltX(0);
        tiltY(0);
      };

      pin.addEventListener('mousemove', onMouseMove, { passive: true });
      pin.addEventListener('mouseleave', onMouseLeave, { passive: true });

      cleanupMouse = () => {
        pin.removeEventListener('mousemove', onMouseMove);
        pin.removeEventListener('mouseleave', onMouseLeave);
      };
    }

    return () => {
      st.kill();
      tl.kill();
      cleanupMouse?.();
      gsap.killTweensOf([c0, c1, c2, root]);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="impact"
      data-nav-theme="dark"
      className="relative w-full bg-[#0E0E10] text-white overflow-hidden"
    >
      {/* Pinned Viewport Container with calibrated padding to clear floating nav and fit any screen */}
      <div
        ref={pinRef}
        className="w-full h-screen max-h-screen flex flex-col justify-between items-center pt-16 sm:pt-20 pb-4 sm:pb-6 px-4 sm:px-8 relative overflow-hidden select-none"
      >
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-1 sm:space-y-1.5 relative z-20 shrink-0">
          <p className="font-editorial italic text-xs sm:text-sm md:text-base text-neutral-400 tracking-tight">
            Our Maternal Health Conviction
          </p>

          <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight text-white leading-tight">
            <span className="block font-sans font-extrabold text-white">
              DIGNIFIED MATERNAL CARE
            </span>
            <span className="block font-editorial font-normal italic text-neutral-300 mt-0.5">
              IS FOUNDATIONAL HEALTH
            </span>
          </h2>
        </div>

        {/* 3D Stack Stage Container - Scaled to fit comfortably on any viewport height */}
        <div
          className="w-full max-w-xl mx-auto flex-1 min-h-0 flex items-center justify-center relative my-1 sm:my-2"
          style={{
            perspective: '1200px',
            transformStyle: 'preserve-3d',
          }}
        >
          <div
            ref={rootRef}
            className="relative w-full max-w-[400px] sm:max-w-[450px] md:max-w-[480px] aspect-[16/10] max-h-[44vh]"
            style={{
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Card 0 (Front): Warm Gold / Sand Border - Empowering Every Mother */}
            <div
              ref={card0Ref}
              className="absolute inset-0 w-full h-full rounded-xs overflow-hidden shadow-2xl border-[5px] sm:border-[6px] border-[#C81E3A] bg-neutral-900 group cursor-pointer"
              style={{
                transformStyle: 'preserve-3d',
                willChange: 'transform, opacity',
              }}
            >
              {/* Blank Placeholder */}
              <div className="w-full h-full bg-neutral-900" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex flex-col justify-end p-3.5 sm:p-4.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-[#C81E3A] font-semibold">
                      CYCLE &amp; HORMONAL INTELLIGENCE
                    </span>
                    <h3 className="text-sm sm:text-base md:text-lg font-extrabold uppercase tracking-tight text-white mt-0.5">
                      EMPOWERING EVERY MOTHER
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-xs text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1 shrink-0">
                    <span>EXPLORE</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            </div>

            {/* Card 1 (Middle): Royal Blue Border - Specialist Telehealth */}
            <div
              ref={card1Ref}
              className="absolute inset-0 w-full h-full rounded-xs overflow-hidden shadow-2xl border-[5px] sm:border-[6px] border-[#C81E3A] bg-neutral-900 group cursor-pointer"
              style={{
                transformStyle: 'preserve-3d',
                willChange: 'transform, opacity',
              }}
            >
              {/* Blank Placeholder */}
              <div className="w-full h-full bg-neutral-900" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex flex-col justify-end p-3.5 sm:p-4.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-[#93C5FD] font-semibold">
                      MDCN TELEHEALTH NETWORK
                    </span>
                    <h3 className="text-sm sm:text-base md:text-lg font-extrabold uppercase tracking-tight text-white mt-0.5">
                      CLOSING GEOGRAPHIC DISTANCE
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-xs text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1 shrink-0">
                    <span>EXPLORE</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2 (Back): Signature Crimson Border - Community & Clinic Digitization */}
            <div
              ref={card2Ref}
              className="absolute inset-0 w-full h-full rounded-xs overflow-hidden shadow-2xl border-[5px] sm:border-[6px] border-[#C81E3A] bg-neutral-900 group cursor-pointer"
              style={{
                transformStyle: 'preserve-3d',
                willChange: 'transform, opacity',
              }}
            >
              {/* Blank Placeholder */}
              <div className="w-full h-full bg-neutral-900" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex flex-col justify-end p-3.5 sm:p-4.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-[#FCA5A5] font-semibold">
                      DIGITAL EMR &amp; CLINIC OS
                    </span>
                    <h3 className="text-sm sm:text-base md:text-lg font-extrabold uppercase tracking-tight text-white mt-0.5">
                      INTERGENERATIONAL DIGNITY
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-xs text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1 shrink-0">
                    <span>EXPLORE</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Bar: Action Trigger */}
        <div className="w-full max-w-4xl mx-auto flex items-center justify-center relative z-20 shrink-0 pt-1 sm:pt-2">
          <a
            href="/about"
            className="group inline-flex items-center gap-2.5 px-5 py-2 sm:py-2.5 bg-[#FF66C4] hover:bg-[#ff4db8] text-neutral-950 font-extrabold text-xs uppercase tracking-wider rounded-xs shadow-md transition-all duration-200 hover:-translate-y-0.5"
            aria-label="View our clinical impact outcomes"
          >
            <span className="w-4 h-4 rounded-xs bg-black/15 flex items-center justify-center transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="w-3 h-3 text-neutral-950" />
            </span>
            <span>VIEW OUR IMPACT</span>
          </a>
        </div>

        {/* Rotating Circular Scroll Badge (Extrafazant "THIS IS HOW WE SCROLL" style) */}
        <div
          ref={badgeRef}
          className="hidden md:flex absolute bottom-4 sm:bottom-6 right-4 sm:right-8 w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-[#BFDBFE] text-neutral-950 items-center justify-center pointer-events-none select-none z-30 shadow-xl"
        >
          {/* Circular SVG Text */}
          <svg
            className="absolute inset-0 w-full h-full animate-[spin_20s_linear_infinite]"
            viewBox="0 0 100 100"
          >
            <path
              id="circlePath"
              d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
              fill="none"
            />
            <text className="text-[10px] font-extrabold tracking-[0.16em] uppercase fill-neutral-950">
              <textPath href="#circlePath" startOffset="0%">
                • THIS IS HOW WE SCROLL • RED APPLE
              </textPath>
            </text>
          </svg>
          <div className="relative z-10 w-7 h-7 rounded-full bg-white/80 flex items-center justify-center shadow-2xs">
            <Globe className="w-3.5 h-3.5 text-neutral-950" />
          </div>
        </div>

      </div>
    </section>
  );
};

