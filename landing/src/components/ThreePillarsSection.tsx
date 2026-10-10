import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import {
  Smartphone,
  Stethoscope,
  Building2,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  X,
  Sparkles,
} from 'lucide-react';

interface PillarData {
  id: string;
  tag: string;
  cardTitle: string;
  cardSubtitle: string;
  colorBg: string;
  image: string;
  imageAlt: string;
  isFramed?: boolean;
  stickerBadge?: {
    text: string;
    bgColor: string;
  };
  chip: string;
  modalName: string;
  modalHeadline: string;
  modalDescription: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  metrics: { value: string; label: string }[];
  features: string[];
  ctaText: string;
  ctaHref: string;
}

export const ThreePillarsSection: React.FC = () => {
  const [selectedPillar, setSelectedPillar] = useState<PillarData | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const clusterRef = useRef<HTMLDivElement>(null);
  const card0Ref = useRef<HTMLDivElement>(null);
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const stickerRef = useRef<HTMLDivElement>(null);
  const badge0Ref = useRef<HTMLDivElement>(null);
  const badge2Ref = useRef<HTMLDivElement>(null);

  const currentHoveredRef = useRef<number | null>(null);
  const lastNormX = useRef<number>(0);
  const lastNormY = useRef<number>(0);

  const pillars: PillarData[] = [
    {
      id: 'app',
      tag: 'Everyday Cycle & Fertility',
      cardTitle: 'CYCLE APP',
      cardSubtitle: 'Personalized cycle & ovulation intelligence.',
      colorBg: '#C81E3A', // Extrafazant Crimson
      image: '/images/card-app.jpg',
      imageAlt: 'Red Apple 3D Cycle & Reproductive Health Technology',
      isFramed: true, // Extrafazant Card 1 has white inner matting frame
      chip: 'FREE TRACKING',
      modalName: 'Red Apple Consumer Mobile App',
      modalHeadline: 'Personalized cycle tracking, AI symptom triage, and reproductive wellness built for African women.',
      modalDescription:
        'Core cycle tracking and educational content are 100% free. Our optional premium tier at ₦1,999/month unlocks advanced cycle forecasting, AI-assisted symptom analysis, and priority telemedicine routing.',
      badge: 'FOR AFRICAN WOMEN',
      icon: Smartphone,
      metrics: [
        { value: '327', label: 'Waitlist in 4 Days' },
        { value: '82.9%', label: 'Rated Extremely Useful' },
        { value: '73.9%', label: 'Willing to Pay Monthly' },
      ],
      features: [
        'Accurate period tracking, ovulation forecasts & fertility planning',
        'AI-assisted symptom analysis flags risks early for doctor review',
        'Culturally grounded health education debunking local myths',
        'Personal digital health record with strict zero-knowledge privacy',
      ],
      ctaText: 'Explore Mobile App',
      ctaHref: '/about#app',
    },
    {
      id: 'connect',
      tag: 'MDCN-Verified Telemedicine',
      cardTitle: 'TELEHEALTH',
      cardSubtitle: 'Licensed African OB-GYNs available on demand.',
      colorBg: '#C81E3A', // Extrafazant Bubblegum Pink
      image: '/images/card-telehealth.jpg',
      imageAlt: 'Dr. Adebayo - Licensed Nigerian OB-GYN',
      stickerBadge: {
        text: 'TALK TO A DOCTOR!',
        bgColor: '#FF9900',
      },
      chip: 'MDCN VERIFIED',
      modalName: 'Red Apple Connect',
      modalHeadline: 'Compassionate video consultations with licensed Nigerian and African OB-GYNs, fertility specialists, and midwives.',
      modalDescription:
        'Healthcare aggregator model: consultations priced transparently at ₦20,000–₦30,000 by licensed clinicians. Red Apple takes a ₦1,000 platform fee, connecting patients directly to verified medical care from home.',
      badge: 'LICENSED CLINICIANS',
      icon: Stethoscope,
      metrics: [
        { value: '180+', label: 'Vetted Medical Specialists' },
        { value: '₦1,000', label: 'Transparent Platform Fee' },
        { value: '< 2 hrs', label: 'Average Time to Visit' },
      ],
      features: [
        'Virtual visits with licensed gynecologists, midwives & fertility experts',
        'Direct electronic prescriptions and localized clinic referrals',
        'Private patient-doctor messaging for antenatal and postpartum care',
        'Continuous symptom loop: Track → Learn → Triage → Consult',
      ],
      ctaText: 'Book a Specialist',
      ctaHref: '/contact',
    },
    {
      id: 'community',
      tag: 'B2B Wellness & Clinic Network',
      cardTitle: 'COMMUNITY',
      cardSubtitle: 'Workplace maternal benefits & clinic network.',
      colorBg: '#C81E3A', // Extrafazant Vibrant Orange
      image: '/images/card-community.jpg',
      imageAlt: 'Joyful Nigerian woman holding smartphone with Red Apple health updates',
      chip: 'PAN-AFRICAN',
      modalName: 'Red Apple Enterprise & Clinic OS',
      modalHeadline: 'B2B licensing for employers, insurers, universities, and partner clinics across West Africa.',
      modalDescription:
        'Empowering universities and corporate employers with structured reproductive health benefits, while connecting partner hospitals and diagnostic centers with pre-screened, digitally triaged referrals.',
      badge: 'FOR EMPLOYERS & CLINICS',
      icon: Building2,
      metrics: [
        { value: '54M', label: 'SAM Across NG, GH & KE' },
        { value: '$411M', label: 'Serviceable Addressable Market' },
        { value: '18 Mo', label: 'Target Launch Runway' },
      ],
      features: [
        'Corporate employee reproductive and maternal wellness benefits',
        'Campus ambassador and university student healthcare programs',
        'Diagnostic laboratory partnerships and referral commission routing',
        'Pan-African expansion framework starting with Nigeria and Ghana',
      ],
      ctaText: 'Partner With Us',
      ctaHref: '/contact',
    },
  ];

  // Smooth, dampened GSAP animator responding to mouse movement and hover states
  const animateCards = (hovered: number | null, normX: number, normY: number, duration = 0.8) => {
    const c0 = card0Ref.current;
    const c1 = card1Ref.current;
    const c2 = card2Ref.current;
    if (!c0 || !c1 || !c2) return;

    const ease = 'power3.out';

    // 0. RESTING TRIPTYCH + GENTLE PARALLAX TILT
    if (hovered === null) {
      gsap.to(c0, {
        x: normX * 7,
        y: normY * 5,
        rotationZ: -5 + normX * 1.5,
        rotationX: -normY * 4.5,
        rotationY: normX * 4.5,
        scale: 1,
        opacity: 1,
        zIndex: 10,
        boxShadow: '0 16px 32px -10px rgba(0, 56, 255, 0.2)',
        duration,
        ease,
        overwrite: 'auto',
      });

      gsap.to(c1, {
        x: normX * 4,
        y: normY * 6,
        rotationZ: 0.5 + normX * 1.5,
        rotationX: -normY * 5,
        rotationY: normX * 5,
        scale: 1,
        opacity: 1,
        zIndex: 20,
        boxShadow: '0 16px 32px -10px rgba(255, 92, 162, 0.2)',
        duration,
        ease,
        overwrite: 'auto',
      });

      gsap.to(c2, {
        x: normX * 7,
        y: normY * 5,
        rotationZ: 5 + normX * 1.5,
        rotationX: -normY * 4.5,
        rotationY: normX * 4.5,
        scale: 1,
        opacity: 1,
        zIndex: 10,
        boxShadow: '0 16px 32px -10px rgba(255, 98, 0, 0.2)',
        duration,
        ease,
        overwrite: 'auto',
      });

      if (stickerRef.current) {
        gsap.to(stickerRef.current, {
          x: normX * 6,
          y: normY * 4,
          rotation: -6,
          scale: 1,
          duration,
          ease,
          overwrite: 'auto',
        });
      }
      return;
    }

    // 1. UNIQUE HOVER ON CARD 0 (BLUE - 3D ISOMETRIC FLOAT)
    if (hovered === 0) {
      gsap.to(c0, {
        x: -10 + normX * 8,
        y: -20 + normY * 6,
        rotationZ: -1 + normX * 2,
        rotationX: -normY * 6 + 2,
        rotationY: -6 + normX * 6,
        scale: 1.08,
        opacity: 1,
        zIndex: 40,
        boxShadow: '0 28px 56px -12px rgba(0, 56, 255, 0.55), 0 0 25px rgba(0, 180, 255, 0.3)',
        duration: Math.max(duration, 0.6),
        ease,
        overwrite: 'auto',
      });

      gsap.to(c1, {
        x: 18 + normX * 4,
        y: 6 + normY * 3,
        rotationZ: 4 + normX * 1.5,
        rotationX: -normY * 3,
        rotationY: 4 + normX * 2,
        scale: 0.93,
        opacity: 0.65,
        zIndex: 15,
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.12)',
        duration: Math.max(duration, 0.6),
        ease,
        overwrite: 'auto',
      });

      gsap.to(c2, {
        x: 36 + normX * 4,
        y: 12 + normY * 3,
        rotationZ: 8.5 + normX * 1.5,
        rotationX: -normY * 3,
        rotationY: 6 + normX * 2,
        scale: 0.89,
        opacity: 0.45,
        zIndex: 10,
        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.08)',
        duration: Math.max(duration, 0.6),
        ease,
        overwrite: 'auto',
      });

      if (badge0Ref.current) {
        gsap.to(badge0Ref.current, {
          x: normX * 5,
          y: normY * 4,
          duration: 0.5,
          ease,
          overwrite: 'auto',
        });
      }
    }

    // 2. UNIQUE HOVER ON CARD 1 (PINK - CENTER STAGE SPRING & CURTAINS PART)
    if (hovered === 1) {
      gsap.to(c1, {
        x: normX * 6,
        y: -22 + normY * 6,
        rotationZ: normX * 2,
        rotationX: -normY * 6,
        rotationY: normX * 6,
        scale: 1.12,
        opacity: 1,
        zIndex: 40,
        boxShadow: '0 30px 65px -10px rgba(255, 92, 162, 0.55), 0 0 28px rgba(255, 140, 190, 0.3)',
        duration: Math.max(duration, 0.6),
        ease,
        overwrite: 'auto',
      });

      gsap.to(c0, {
        x: -30 + normX * 4,
        y: 10 + normY * 3,
        rotationZ: -11 + normX * 1.5,
        rotationX: -normY * 3,
        rotationY: -6 + normX * 2,
        scale: 0.89,
        opacity: 0.5,
        zIndex: 10,
        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.12)',
        duration: Math.max(duration, 0.6),
        ease,
        overwrite: 'auto',
      });

      gsap.to(c2, {
        x: 30 + normX * 4,
        y: 10 + normY * 3,
        rotationZ: 11 + normX * 1.5,
        rotationX: -normY * 3,
        rotationY: 6 + normX * 2,
        scale: 0.89,
        opacity: 0.5,
        zIndex: 10,
        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.12)',
        duration: Math.max(duration, 0.6),
        ease,
        overwrite: 'auto',
      });

      if (stickerRef.current) {
        gsap.to(stickerRef.current, {
          scale: 1.18,
          rotation: -12 + normX * 3,
          x: normX * 8,
          y: normY * 6,
          duration: 0.55,
          ease: 'back.out(1.5)',
          overwrite: 'auto',
        });
      }
    }

    // 3. UNIQUE HOVER ON CARD 2 (ORANGE - KINETIC SOCIAL COUNTER-SNAP)
    if (hovered === 2) {
      gsap.to(c2, {
        x: 10 + normX * 8,
        y: -20 + normY * 6,
        rotationZ: -3 + normX * 2,
        rotationX: -normY * 6,
        rotationY: 6 + normX * 6,
        scale: 1.08,
        opacity: 1,
        zIndex: 40,
        boxShadow: '0 28px 56px -10px rgba(255, 98, 0, 0.55), 0 0 25px rgba(255, 150, 50, 0.3)',
        duration: Math.max(duration, 0.6),
        ease,
        overwrite: 'auto',
      });

      gsap.to(c1, {
        x: -18 + normX * 4,
        y: 6 + normY * 3,
        rotationZ: -4 + normX * 1.5,
        rotationX: -normY * 3,
        rotationY: -4 + normX * 2,
        scale: 0.93,
        opacity: 0.65,
        zIndex: 15,
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.12)',
        duration: Math.max(duration, 0.6),
        ease,
        overwrite: 'auto',
      });

      gsap.to(c0, {
        x: -36 + normX * 4,
        y: 12 + normY * 3,
        rotationZ: -8.5 + normX * 1.5,
        rotationX: -normY * 3,
        rotationY: -6 + normX * 2,
        scale: 0.89,
        opacity: 0.45,
        zIndex: 10,
        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.08)',
        duration: Math.max(duration, 0.6),
        ease,
        overwrite: 'auto',
      });

      if (badge2Ref.current) {
        gsap.to(badge2Ref.current, {
          x: normX * 5,
          y: normY * 4,
          duration: 0.5,
          ease,
          overwrite: 'auto',
        });
      }
    }
  };

  // Mouse event listener on the card cluster for silky, weighted response
  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;

    // Check pointer fine / desktop capability
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = cluster.getBoundingClientRect();
      // Normalized between -0.5 and +0.5
      const nX = (e.clientX - rect.left) / rect.width - 0.5;
      const nY = (e.clientY - rect.top) / rect.height - 0.5;

      lastNormX.current = nX;
      lastNormY.current = nY;

      // Silky smooth duration of 0.75s for natural weighted physics
      animateCards(currentHoveredRef.current, nX, nY, 0.75);
    };

    const handleMouseLeave = () => {
      lastNormX.current = 0;
      lastNormY.current = 0;
      currentHoveredRef.current = null;
      setHoveredIndex(null);
      animateCards(null, 0, 0, 0.9);
    };

    cluster.addEventListener('mousemove', handleMouseMove, { passive: true });
    cluster.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    // Initial position setup
    animateCards(null, 0, 0, 0.1);

    return () => {
      cluster.removeEventListener('mousemove', handleMouseMove);
      cluster.removeEventListener('mouseleave', handleMouseLeave);
      gsap.killTweensOf([card0Ref.current, card1Ref.current, card2Ref.current, stickerRef.current]);
    };
  }, []);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPillar(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCardHover = (idx: number) => {
    currentHoveredRef.current = idx;
    setHoveredIndex(idx);
    animateCards(idx, lastNormX.current, lastNormY.current, 0.6);
  };

  const handleCardUnhover = () => {
    currentHoveredRef.current = null;
    setHoveredIndex(null);
    animateCards(null, lastNormX.current, lastNormY.current, 0.75);
  };

  return (
    <section
      id="products"
      className="relative w-full bg-white py-20 sm:py-24 md:py-32 px-4 sm:px-8 md:px-12 font-sans border-t border-neutral-100 overflow-hidden"
    >
      <div className="max-w-5xl mx-auto space-y-10 sm:space-y-12 relative z-10">

        {/* Section Header: Extrafazant "Onze diensten / WAT WE DOEN" Style */}
        <div className="text-center space-y-1 sm:space-y-1.5">
          <p className="font-editorial italic text-base sm:text-lg md:text-xl text-neutral-600 tracking-tight">
            Our care ecosystem
          </p>

          <h2 className="text-3xl sm:text-4xl md:text-[44px] font-black uppercase tracking-tight text-neutral-950 leading-[1.05]">
            <span className="font-sans font-black">WHAT WE </span>
            <span className="font-editorial font-normal italic">DO</span>
          </h2>
        </div>

        {/* The 3 Interactive Cards Clustered Tightly Together with 3D Mouse Parallax Tilt */}
        <div
          ref={clusterRef}
          className="flex flex-row items-center justify-center -space-x-3 sm:-space-x-4 md:-space-x-5 lg:-space-x-6 max-w-[760px] mx-auto pt-4 sm:pt-6 pb-6 select-none"
          style={{
            perspective: '1200px',
            transformStyle: 'preserve-3d',
          }}
        >
          {pillars.map((pillar, idx) => {
            const cardRef = idx === 0 ? card0Ref : idx === 1 ? card1Ref : card2Ref;
            const isThisCardHovered = hoveredIndex === idx;

            return (
              <div
                key={pillar.id}
                ref={cardRef}
                onClick={() => setSelectedPillar(pillar)}
                onMouseEnter={() => handleCardHover(idx)}
                onMouseLeave={handleCardUnhover}
                style={{
                  transformStyle: 'preserve-3d',
                  willChange: 'transform, opacity, box-shadow',
                  transformOrigin: 'center center',
                }}
                className="w-[170px] sm:w-[215px] md:w-[235px] lg:w-[250px] shrink-0 cursor-pointer relative"
              >
                {/* Outer Colored Poster Card Frame */}
                <div
                  className="rounded-xs p-2.5 sm:p-3 md:p-3.5 pb-4 sm:pb-5 text-white shadow-xl flex flex-col justify-between"
                  style={{
                    backgroundColor: pillar.colorBg,
                  }}
                >
                  {/* Top Inner Image Container */}
                  <div
                    className={`relative w-full aspect-[3/3.7] rounded-xs overflow-hidden ${pillar.isFramed ? 'p-1.5 sm:p-2 bg-white' : 'bg-neutral-900'
                      }`}
                  >
                    <div className="w-full h-full relative overflow-hidden rounded-xs bg-neutral-900">
                      <div className="w-full h-full bg-neutral-900" />

                      {/* Card 0 Unique Hover Feature: 3D Tech HUD Badge */}
                      {idx === 0 && (
                        <div
                          ref={badge0Ref}
                          className={`absolute top-2 right-2 z-20 transition-all duration-300 transform ${isThisCardHovered
                            ? 'opacity-100 scale-100 translate-y-0'
                            : 'opacity-0 scale-75 -translate-y-1'
                            }`}
                        >
                          <span className="px-2 py-0.5 rounded-xs bg-black/80 backdrop-blur-md text-[#93C5FD] font-mono text-[8px] uppercase tracking-wider font-bold shadow-md border border-blue-400/30 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 text-[#60A5FA]" />
                            <span>3D CYCLIC AI</span>
                          </span>
                        </div>
                      )}

                      {/* Card 1 Unique Hover Feature: Playful Wobble / Spring Sticker Badge */}
                      {idx === 1 && pillar.stickerBadge && (
                        <div
                          ref={stickerRef}
                          className="absolute top-2.5 left-0 right-0 flex items-center justify-center pointer-events-none z-20"
                        >
                          <span
                            className="inline-block px-2 sm:px-3 py-0.5 text-white font-black text-[10px] sm:text-xs uppercase tracking-wider rounded-xs border sm:border-2 border-white shadow-md"
                            style={{
                              backgroundColor: pillar.stickerBadge.bgColor,
                              textShadow: '0 2px 4px rgba(0,0,0,0.4)',
                            }}
                          >
                            {pillar.stickerBadge.text}
                          </span>
                        </div>
                      )}

                      {/* Card 2 Unique Hover Feature: Live Community Heartbeat Ping */}
                      {idx === 2 && (
                        <div
                          ref={badge2Ref}
                          className={`absolute top-2 right-2 z-20 transition-all duration-300 transform ${isThisCardHovered
                            ? 'opacity-100 scale-100 translate-y-0'
                            : 'opacity-0 scale-75 -translate-y-1'
                            }`}
                        >
                          <span className="px-2 py-0.5 rounded-full bg-white/95 backdrop-blur-md text-neutral-900 font-bold text-[8px] sm:text-[9px] shadow-md border border-orange-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>LIVE CONNECT</span>
                          </span>
                        </div>
                      )}

                      {/* Inset Category Chip */}
                      <div className="absolute bottom-1.5 left-1.5 z-10 pointer-events-none">
                        <span className="px-1.5 py-0.5 rounded-xs bg-black/60 backdrop-blur-md text-[8px] sm:text-[9px] font-mono uppercase tracking-wider text-white font-semibold">
                          {pillar.chip}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Text Area on the Colored Card */}
                  <div className="pt-2.5 sm:pt-3.5 px-0.5 space-y-0.5 sm:space-y-1">
                    <h3
                      className={`text-lg sm:text-xl md:text-2xl font-black uppercase tracking-tight text-white leading-none transition-all duration-300 ${isThisCardHovered ? 'tracking-normal' : 'tracking-tight'
                        }`}
                    >
                      {pillar.cardTitle}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] md:text-xs text-white/95 leading-snug font-medium line-clamp-2">
                      {pillar.cardSubtitle}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA: Extrafazant "Discover more ->" with Blue Box Arrow */}
        <div className="flex justify-center pt-2 sm:pt-4">
          <a
            href="/about"
            className="group inline-flex items-center gap-2.5 font-editorial italic text-base sm:text-lg md:text-xl text-neutral-900 hover:text-[#C81E3A] transition-colors cursor-pointer select-none"
          >
            <span>Discover more</span>
            <span className="w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-xs bg-[#C81E3A] text-white flex items-center justify-center transition-transform duration-200 group-hover:translate-x-1 shadow-xs shrink-0">
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </span>
          </a>
        </div>

      </div>

      {/* Interactive Deep-Dive Modal when a Card is Clicked */}
      {selectedPillar && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedPillar(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-neutral-200 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className="p-6 sm:p-8 text-white relative flex items-start justify-between"
              style={{ backgroundColor: selectedPillar.colorBg }}
            >
              <div className="space-y-1.5 pr-8">
                <span className="text-[10px] font-mono uppercase tracking-widest bg-black/20 px-2.5 py-1 rounded-xs font-semibold">
                  {selectedPillar.badge}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
                  {selectedPillar.modalName}
                </h3>
                <p className="text-xs sm:text-sm text-white/90 font-medium">
                  {selectedPillar.modalHeadline}
                </p>
              </div>

              <button
                onClick={() => setSelectedPillar(null)}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <p className="text-sm sm:text-base text-neutral-700 leading-relaxed">
                {selectedPillar.modalDescription}
              </p>

              {/* Key Capabilities */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Care Pathways &amp; Features
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedPillar.features.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 bg-neutral-50 p-3 rounded-lg border border-neutral-100"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#C81E3A] shrink-0 mt-0.5" />
                      <span className="text-xs text-neutral-800 leading-snug">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-neutral-100">
                {selectedPillar.metrics.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-neutral-50 rounded-xl text-center border border-neutral-100"
                  >
                    <div className="font-editorial text-xl sm:text-2xl font-bold text-neutral-900">
                      {m.value}
                    </div>
                    <div className="text-[10px] text-neutral-600 uppercase tracking-tight font-medium mt-0.5">
                      {m.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer CTA & Security Assurance */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-neutral-100">
                <a
                  href={selectedPillar.ctaHref}
                  onClick={() => setSelectedPillar(null)}
                  className="px-6 py-3 rounded-full text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: selectedPillar.colorBg }}
                >
                  <span>{selectedPillar.ctaText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>

                <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>NDPC Data Protected &amp; Verified</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
