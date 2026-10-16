import React, { useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  credentials?: string;
  image: string;
  imageAlt: string;
  objectPosition?: string;
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
  titleBubble = 'FOUNDING TEAM',
  showOvalBadge = false,
  showBottomCta = true,
  className = '',
}) => {
  const [hoveredMember, setHoveredMember] = useState<string | null>(null);

  // 1. Dr. Molib (Founder & CEO)
  // 2. Dr. Chisomebi (CMO & Co-Founder)
  // 3. Engr. Mesal (CTO & Co-Founder)
  const allMembers: TeamMember[] = [
    {
      id: 'molib',
      name: 'Dr. Molib Okubor',
      role: 'Founder & CEO',
      credentials: 'Delta State University (Medicine) • Health Innovation & Growth',
      image: '/images/team-molib.png',
      imageAlt: 'Dr. Molib Okubor - Founder and Chief Executive Officer',
      objectPosition: 'object-top',
    },
    {
      id: 'chisomebi',
      name: 'Dr. Chisomebi Angelica Azubuike',
      role: 'CMO & Co-Founder',
      credentials: 'MD (Univ. of Nigeria) • Public Health Advocate',
      image: '/images/team-chisomebi.png',
      imageAlt: 'Dr. Chisomebi Azubuike - Medical Doctor & Chief Marketing Officer',
      objectPosition: 'object-center',
    },
    {
      id: 'mesal',
      name: 'Engr. Mesal',
      role: 'CTO & Co-Founder',
      credentials: 'SWE',
      image: '/images/team-mesal.png',
      imageAlt: 'Engr. Mesal - Chief Technology Officer & Software Architect',
      objectPosition: 'object-top',
    },
  ];

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
        <div className="relative w-full aspect-[3/3.8] bg-neutral-100 overflow-hidden rounded-[24px] sm:rounded-[32px] shadow-lg transition-all duration-500 group-hover:shadow-2xl">
          {/* Real Photo */}
          <img
            src={member.image}
            alt={member.imageAlt}
            className={`w-full h-full object-cover ${member.objectPosition || 'object-top'} transition-transform duration-700 group-hover:scale-105`}
            loading="lazy"
          />

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

        {/* 1. MOBILE VIEW: Sequential Vertical Order (Dr. Molib -> Dr. Chisomebi -> Engr. Mesal) */}
        <div className="flex flex-col space-y-12 md:hidden">
          {/* Section Header */}
          <div className="space-y-3 pt-2">
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

              <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-neutral-950 leading-[1.05]">
                <span className="font-editorial italic font-normal text-neutral-800 lowercase">
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

          {/* Members in exact sequential order */}
          {allMembers.map(renderMemberCard)}
        </div>

        {/* 2. DESKTOP VIEW: Staggered Alternating Collage (Extrafazant Style) */}
        <div className="hidden md:grid md:grid-cols-2 gap-10 md:gap-14 lg:gap-20 items-start">

          {/* COLUMN 1 (LEFT): Section Header + Dr. Chisomebi below */}
          <div className="space-y-16 sm:space-y-24 md:space-y-28">

            {/* Header: Extrafazant Oval Stamp + Kicker + Title */}
            <div className="space-y-3 pt-2">
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
                  <span className="font-editorial italic font-normal text-neutral-800 lowercase">
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

            {/* Member 2: Dr. Chisomebi (Sits below Section Header) */}
            {renderMemberCard(allMembers[1])}
          </div>

          {/* COLUMN 2 (RIGHT): Starts high up alongside Header with Dr. Molib, then Engr. Mesal */}
          <div className="space-y-16 sm:space-y-24 md:space-y-28">
            {/* Member 1: Dr. Molib (Top Right) */}
            {renderMemberCard(allMembers[0])}

            {/* Member 3: Engr. Mesal (Bottom Right) */}
            {renderMemberCard(allMembers[2])}
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

              {/* Hand-Drawn Wavy Underline Stroke */}
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
