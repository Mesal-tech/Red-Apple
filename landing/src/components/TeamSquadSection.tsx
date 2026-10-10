import React, { useState } from 'react';
import { ArrowRight, Sparkles, Heart } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  bubbleName: string;
  bubbleColor: 'white' | 'blue' | 'orange';
  role: string;
  credentials?: string;
  image: string;
  imageAlt: string;
  stickerBadge?: {
    text: string;
    bgColor: string;
    rotation: string;
  };
}

interface TeamSquadSectionProps {
  id?: string;
  subtitle?: string;
  titlePrefix?: string;
  titleBubble?: string;
  showOvalBadge?: boolean;
  showBottomCta?: boolean;
  className?: string;
}

export const TeamSquadSection: React.FC<TeamSquadSectionProps> = ({
  id = 'team',
  subtitle = 'The Frontline Minds Behind Red Apple',
  titlePrefix = 'the ',
  titleBubble = 'CLINICAL SQUAD',
  showOvalBadge = false,
  showBottomCta = true,
  className = '',
}) => {
  const [hoveredMember, setHoveredMember] = useState<string | null>(null);

  // Column 1 (Left Column): Positioned below the header
  const leftColumnMembers: TeamMember[] = [
    {
      id: 'chisomebi',
      name: 'Dr. Chisomebi Angelica Azubuike',
      bubbleName: 'Chisomebi',
      bubbleColor: 'blue',
      role: 'CMO & Co-Founder',
      credentials: 'MD (Univ. of Nigeria) • Public Health Advocate',
      image: '/images/team-chisomebi.jpg',
      imageAlt: 'Dr. Chisomebi Azubuike - Medical Doctor & Chief Marketing Officer',
    },
  ];

  // Column 2 (Right Column): Starts high up alongside the header
  const rightColumnMembers: TeamMember[] = [
    {
      id: 'molib',
      name: 'Mr. Molib Okubor',
      bubbleName: 'Molib',
      bubbleColor: 'white',
      role: 'Founder & CEO',
      credentials: 'Delta State University (Medicine) • 6 yrs Growth Strategy',
      image: '/images/team-molib.jpg',
      imageAlt: 'Mr. Molib Okubor - Founder and Chief Executive Officer',
    },
    {
      id: 'mesal',
      name: 'Mesal',
      bubbleName: 'Mesal',
      bubbleColor: 'white',
      role: 'CTO & Lead Architect',
      credentials: '4 yrs Enterprise Architecture • Clinical AI Systems',
      image: '/images/team-mesal.jpg',
      imageAlt: 'Mesal - Chief Technology Officer & Software Architect',
      stickerBadge: {
        text: 'DIGNIFIED CARE. REAL HEALTH.',
        bgColor: '#16A34A',
        rotation: 'rotate-3',
      },
    },
  ];


  const renderBubbleName = (text: string, color: 'white' | 'blue' | 'orange', isHovered: boolean) => {
    const colorClasses = {
      white: 'text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]',
      blue: 'text-[#C81E3A] drop-shadow-[0_4px_12px_rgba(0,56,255,0.4)]',
      orange: 'text-[#C81E3A] drop-shadow-[0_4px_12px_rgba(255,98,0,0.4)]',
    };

    return (
      <span
        style={{ fontFamily: 'var(--font-bubble, "DynaPuff", cursive, sans-serif)' }}
        className={`inline-block text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight select-none transition-all duration-300 transform ${isHovered ? 'scale-110 -rotate-3' : 'scale-100 rotate-0'
          } ${colorClasses[color]}`}
      >
        {text}
      </span>
    );
  };

  const renderMemberCard = (member: TeamMember) => {
    const isHovered = hoveredMember === member.id;

    return (
      <div
        key={member.id}
        className="group relative cursor-pointer"
        onMouseEnter={() => setHoveredMember(member.id)}
        onMouseLeave={() => setHoveredMember(null)}
      >
        {/* Member Photo Frame */}
        <div className="relative w-full aspect-[3/3.8] bg-neutral-100 overflow-hidden shadow-lg transition-all duration-500 group-hover:shadow-2xl">
          {/* Blank Placeholder */}
          <div className="w-full h-full bg-neutral-100" />

          {/* Overlaid Puffy Bubble Name */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
            {renderBubbleName(member.bubbleName, member.bubbleColor, isHovered)}
          </div>

          {/* Slanted Die-Cut Sticker */}
          {member.stickerBadge && (
            <div
              className={`absolute bottom-4 right-4 z-20 pointer-events-none transition-transform duration-300 transform ${isHovered ? 'scale-110 -rotate-2' : member.stickerBadge.rotation
                }`}
            >
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-white font-black text-[11px] sm:text-xs uppercase tracking-wider rounded-xs border-2 border-white shadow-xl"
                style={{ backgroundColor: member.stickerBadge.bgColor }}
              >
                <Heart className="w-3.5 h-3.5 fill-white" />
                <span>{member.stickerBadge.text}</span>
              </span>
            </div>
          )}

          {/* Subtle Bottom Gradient on Hover */}
          <div
            className={`absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'
              }`}
          />
        </div>

        {/* Member Info Label */}
        <div className="pt-3.5 sm:pt-4 px-1 flex flex-col justify-start">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-editorial text-lg sm:text-xl text-neutral-900 font-normal">
              {member.name}
            </h3>
          </div>
          <p className="font-sans text-xs text-neutral-500 font-medium tracking-tight mt-0.5">
            {member.role} {member.credentials && `• ${member.credentials}`}
          </p>
        </div>
      </div>
    );
  };

  return (
    <section
      id={id}
      className={`relative w-full bg-white py-20 sm:py-28 md:py-36 px-6 sm:px-10 lg:px-16 overflow-hidden border-t border-neutral-100 font-sans ${className}`}
    >
      <div className="max-w-5xl mx-auto relative z-10">

        {/* Two-Column Alternating Staggered Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 lg:gap-20 items-start">

          {/* COLUMN 1 (LEFT): Section Header + Staggered Photos Below */}
          <div className="space-y-16 sm:space-y-24 md:space-y-28">

            {/* Header: Extrafazant Oval Stamp + Kicker + Title matching attached image */}
            <div className="space-y-3 pt-2">
              {/* Oval Logo Stamp Badge (Optional, Extrafazant Style) */}
              {showOvalBadge && (
                <div className="inline-block transform -rotate-12 hover:rotate-0 transition-transform cursor-pointer">
                  <div className="px-3.5 py-1 rounded-full border-[2.5px] border-[#E11D48] bg-white text-[#C81E3A] font-black text-xs sm:text-sm font-sans tracking-tight shadow-xs flex items-center gap-1">
                    <span>RA</span>
                    <Sparkles className="w-3 h-3 text-[#E11D48]" />
                  </div>
                </div>
              )}

              <div>
                <p className="font-editorial italic text-base sm:text-lg text-neutral-600 mb-1 tracking-tight">
                  {subtitle}
                </p>

                <h2 className="text-3xl sm:text-4xl md:text-[46px] font-black uppercase tracking-tight text-neutral-950 leading-[1.05]">
                  <span className="font-editorial italic font-normal text-neutral-800 lowercase sm:lowercase">
                    {titlePrefix}
                  </span>
                  <span
                    style={{ fontFamily: 'var(--font-bubble, "DynaPuff", cursive, sans-serif)' }}
                    className="text-crimson font-bold inline-block hover:scale-105 transition-transform duration-200"
                  >
                    {titleBubble}
                  </span>
                </h2>
              </div>
            </div>

            {/* Left Column Photos */}
            {leftColumnMembers.map(renderMemberCard)}
          </div>

          {/* COLUMN 2 (RIGHT): Starts high up next to Header */}
          <div className="space-y-16 sm:space-y-24 md:space-y-28">
            {rightColumnMembers.map(renderMemberCard)}
          </div>

        </div>

        {/* Floating Die-Cut Center Badge */}
        <div className="hidden md:flex absolute top-[52%] left-[45%] z-30 transform -rotate-12 hover:rotate-0 transition-transform pointer-events-none select-none">
          <div
            style={{ fontFamily: 'var(--font-bubble, "DynaPuff", cursive, sans-serif)' }}
            className="px-4 py-1.5 bg-[#FACC15] text-[#7C3AED] font-bold text-xs uppercase tracking-wider rounded-xs border-2 border-[#7C3AED] shadow-xl drop-shadow-[0_8px_16px_rgba(0,0,0,0.15)]"
          >
            RED APPLE
          </div>
        </div>

        {/* Bottom CTA with Hand-drawn Wavy Squiggly Underline */}
        {showBottomCta && (
          <div className="flex flex-col items-center justify-center pt-20 sm:pt-28">
            <a
              href="/about"
              className="group inline-flex flex-col items-center cursor-pointer select-none"
            >
              <div className="inline-flex items-center gap-3 font-editorial text-xl sm:text-2xl md:text-3xl text-neutral-900 group-hover:text-[#C81E3A] transition-colors">
                <span>Discover more about us</span>
                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-xs bg-[#C81E3A] text-white flex items-center justify-center transition-transform duration-200 group-hover:translate-x-1.5 shadow-xs shrink-0">
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                </span>
              </div>

              {/* Hand-Drawn Wavy Blue Underline Stroke (Extrafazant Style) */}
              <svg
                className="w-48 sm:w-64 h-3 sm:h-4 text-[#C81E3A] mt-1 transition-transform duration-300 group-hover:scale-x-105"
                viewBox="0 0 240 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 7 Q 25 1, 50 7 T 100 7 T 150 7 T 200 7 T 237 7"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </div>
        )}
      </div>
    </section>
  );
};

