import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { HeartPulse, Stethoscope, Baby, ShieldCheck, ArrowUpRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export const PlatformSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const card3Ref = useRef<HTMLDivElement>(null);
  const card4Ref = useRef<HTMLDivElement>(null);
  const quoteRef = useRef<HTMLDivElement>(null);

  const pillars = [
    {
      ref: card1Ref,
      id: '01',
      title: 'CYCLE & FERTILITY PREDICTION',
      subtitle: 'ALGORITHMIC REPRODUCTIVE TIMING',
      description: 'Machine-learning models tuned for variable cycle lengths, basal body temperature, and symptom correlation to pinpoint fertile windows.',
      icon: HeartPulse,
      tag: 'CORE ENGINE',
    },
    {
      ref: card2Ref,
      id: '02',
      title: 'TELEMEDICINE & SPECIALISTS',
      subtitle: 'DIRECT OB-GYN ACCESS',
      description: 'Encrypted 1-on-1 virtual sessions with vetted reproductive health practitioners, fertility consultants, and licensed Nigerian doctors.',
      icon: Stethoscope,
      tag: 'ON-DEMAND',
    },
    {
      ref: card3Ref,
      id: '03',
      title: 'MATERNAL & PREGNANCY CARE',
      subtitle: 'WEEK-BY-WEEK EMBRYONIC TRACKING',
      description: 'Customized antenatal schedules, fetal milestone metrics, maternal nutrition guides, and timely clinical reminder workflows.',
      icon: Baby,
      tag: 'GESTATION MODE',
    },
    {
      ref: card4Ref,
      id: '04',
      title: 'ZERO-KNOWLEDGE PRIVACY',
      subtitle: 'NDPA 2023 COMPLIANT INFRASTRUCTURE',
      description: 'End-to-end client-side encryption ensuring reproductive health telemetry and medical consultation records remain strictly private.',
      icon: ShieldCheck,
      tag: 'AES-256 GCM',
    },
  ];

  useGSAP(
    () => {
      if (!sectionRef.current) return;

      // 1. Header Spring Parallax Entrance (with spring inertia & subtle bounce)
      gsap.fromTo(
        headerRef.current,
        {
          y: 180,
          opacity: 0,
          scale: 0.95,
        },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          ease: 'back.out(1.6)',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 85%',
            end: 'top 25%',
            scrub: 1.4, // Spring inertia catch-up
          },
        }
      );

      // 2. Spring-Type Staggered Differential Card Cascade
      const cardRefs = [card1Ref.current, card2Ref.current, card3Ref.current, card4Ref.current];
      cardRefs.forEach((card, index) => {
        if (!card) return;
        const initialY = 200 + index * 55; // Spring differential depth

        gsap.fromTo(
          card,
          {
            y: initialY,
            opacity: 0,
            scale: 0.9,
            rotateX: 8,
          },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            rotateX: 0,
            ease: 'back.out(1.5)',
            scrollTrigger: {
              trigger: card,
              start: 'top 95%',
              end: 'top 50%',
              scrub: 1.5, // Tactile spring damping
            },
          }
        );
      });

      // 3. Manifesto Quote Spring Entrance
      if (quoteRef.current) {
        gsap.fromTo(
          quoteRef.current,
          {
            y: 140,
            opacity: 0,
            scale: 0.94,
          },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            ease: 'back.out(1.4)',
            scrollTrigger: {
              trigger: quoteRef.current,
              start: 'top 92%',
              end: 'top 55%',
              scrub: 1.4,
            },
          }
        );
      }
    },
    { scope: sectionRef }
  );

  return (
    <section
      id="platform-section"
      ref={sectionRef}
      className="relative w-full min-h-screen bg-neutral-950 text-white px-6 sm:px-10 md:px-16 lg:px-24 py-24 md:py-36 z-30 font-sans border-t border-neutral-800 shadow-[0_-50px_100px_rgba(0,0,0,0.98)]"
      style={{ perspective: 1000 }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header with Spring Parallax */}
        <div
          ref={headerRef}
          className="flex flex-col md:flex-row justify-between items-start md:items-end pb-16 border-b border-neutral-800 gap-8"
        >
          <div className="max-w-2xl">
            <span className="font-mono text-xs text-crimson font-bold tracking-widest block mb-3 uppercase">
              [ 01 // PLATFORM ARCHITECTURE ]
            </span>
            <h2 className="font-display font-normal text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight leading-[0.88] uppercase">
              REPRODUCTIVE HEALTHCARE <br />
              <span className="text-neutral-500">REIMAGINED FOR AFRICA</span>
            </h2>
          </div>

          <div className="max-w-xs font-mono text-xs text-neutral-400 leading-relaxed">
            <p>
              Red Apple unites fertility tracking, clinical diagnostics, and localized healthcare access into a single unified mobile experience.
            </p>
          </div>
        </div>

        {/* 4 Pillars Grid with Spring Parallax Stagger */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 mt-16">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.id}
                ref={pillar.ref}
                className="group relative p-8 sm:p-10 bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 hover:border-crimson/50 transition-all duration-300 rounded-xs flex flex-col justify-between shadow-xl"
              >
                <div>
                  <div className="flex justify-between items-start mb-8">
                    <div className="p-3 bg-neutral-800 group-hover:bg-crimson text-white transition-colors duration-300 rounded-xs shadow-md">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-neutral-500 font-bold">[{pillar.id}]</span>
                      <span className="font-mono text-[10px] bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded-xs">
                        {pillar.tag}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-display font-normal text-2xl sm:text-3xl md:text-4xl tracking-tight text-white mb-2 uppercase group-hover:text-crimson transition-colors">
                    {pillar.title}
                  </h3>
                  <div className="font-mono text-[11px] text-neutral-400 font-semibold tracking-wider uppercase mb-4">
                    {pillar.subtitle}
                  </div>
                  <p className="text-neutral-400 text-sm leading-relaxed font-sans">
                    {pillar.description}
                  </p>
                </div>

                <div className="pt-8 mt-8 border-t border-neutral-800/80 flex justify-between items-center text-xs font-mono text-neutral-400 group-hover:text-white transition-colors">
                  <span>EXPLORE PROTOCOL</span>
                  <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Empowering Manifesto Footer Quote with Spring Parallax */}
        <div
          ref={quoteRef}
          className="mt-24 p-10 md:p-14 border border-neutral-800 bg-gradient-to-r from-neutral-900 via-neutral-900/80 to-neutral-950 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 shadow-2xl"
        >
          <div>
            <span className="font-mono text-xs text-crimson font-bold tracking-widest block mb-2">
              [ THE RED APPLE ETHOS ]
            </span>
            <p className="font-display font-normal text-2xl sm:text-3xl md:text-4xl text-neutral-200 tracking-tight leading-snug uppercase">
              "EVERY WOMAN HAS THE RIGHT TO UNDERSTAND HER BODY, ACCESS TRUSTED CARE, AND THRIVE AT EVERY STAGE."
            </p>
          </div>
          <div className="shrink-0">
            <span className="font-mono text-xs text-neutral-500 block">PAN-AFRICAN HEALTH TECH</span>
            <span className="font-mono text-xs font-bold text-white">RED APPLE © 2026</span>
          </div>
        </div>
      </div>
    </section>
  );
};
