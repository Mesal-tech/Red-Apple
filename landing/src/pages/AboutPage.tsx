import React, { useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { KineticHeroText } from '../components/KineticHeroText';
import { TeamSquadSection } from '../components/TeamSquadSection';
import { ArrowDown } from 'lucide-react';

interface AboutPageProps {
  onNavigateHome?: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const scrollToTeam = () => {
    const el = document.getElementById('team');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full min-h-screen bg-white text-neutral-900 font-sans selection:bg-red-100 overflow-x-hidden">

      {/* 1. Global Floating Navbar with active squiggly indicator */}
      <Navbar brandName="RED APPLE" activePage="about" />

      {/* 2. Hero Section: Exactly matching Extrafazant ("About us" / "WE ARE CLINICIANS" / Manifesto / Squiggly CTA) */}
      <header className="relative w-full pt-28 sm:pt-36 md:pt-42 pb-16 sm:pb-24 px-6 sm:px-10 lg:px-14 bg-white">
        <div className="max-w-6xl mx-auto text-center space-y-5 sm:space-y-6 relative z-10">

          {/* Top Label in elegant serif italic */}
          <div className="flex items-center justify-center">
            <span className="font-editorial italic text-base sm:text-lg md:text-xl text-neutral-500 font-normal tracking-tight">
              About us
            </span>
          </div>

          {/* Main Headline with Extrafazant-Style GSAP Kinetic Variable Font Weight Hover Effect */}
          <div className="flex justify-center w-full">
            <KineticHeroText
              line2Sans="WE ARE"
              line2Serif="CLINICIANS"
              fontSizeClass="text-4xl sm:text-6xl md:text-7xl lg:text-[80px]"
              className="text-center"
            />
          </div>

          {/* Centered Editorial Manifesto Paragraph */}
          <div className="max-w-2xl mx-auto pt-1">
            <p className="font-sans text-base sm:text-lg md:text-xl text-neutral-700 leading-relaxed font-normal">
              At Red Apple, we refuse to accept preventable maternal mortality as inevitable. We are clinicians, maternal health advocates, and engineers dedicated to transforming obstetric care across Africa. We turn frontline clinical insight into intelligent protocols and paper clinics into digital systems. From maternal vulnerability to generational dignity.
            </p>
          </div>

          {/* CTA Link with Extrafazant signature Hand-Drawn Wavy Blue Squiggly Underline */}
          <div className="pt-2 flex justify-center">
            <button
              onClick={scrollToTeam}
              className="group inline-flex flex-col items-center gap-1.5 cursor-pointer select-none focus:outline-hidden"
              aria-label="Discover our team"
            >
              <div className="inline-flex items-center gap-2.5 text-sm sm:text-base font-bold text-neutral-900 group-hover:text-[#C81E3A] transition-colors">
                <span>Discover our team</span>
                <span className="w-5 h-5 rounded-xs bg-[#C81E3A] text-white flex items-center justify-center transition-transform duration-200 group-hover:translate-y-1">
                  <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
                </span>
              </div>
              {/* Hand-drawn squiggly blue wave SVG */}
              <svg
                className="w-40 sm:w-44 h-2 text-[#C81E3A] -mt-0.5 overflow-visible"
                viewBox="0 0 160 8"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2 4.5C8 1 14 7 20 4.5C26 2 32 7 38 4.5C44 2 50 7 56 4.5C62 2 68 7 74 4.5C80 2 86 7 92 4.5C98 2 104 7 110 4.5C116 2 122 7 128 4.5C134 2 140 7 146 4.5C152 2 156 5.5 158 4.5"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* 3. The Clinical Squad (Matching Homepage TeamSquadSection Design with Header from attached reference) */}
      <TeamSquadSection
        id="team"
        subtitle="The Frontline Minds Behind Red Apple"
        titlePrefix="the "
        titleBubble="CLINICAL SQUAD"
        showOvalBadge={false}
        showBottomCta={false}
      />

      {/* 7. Global Footer */}
      <Footer />

    </div>
  );
};
