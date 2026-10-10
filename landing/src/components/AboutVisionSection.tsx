import React from 'react';
import { Heart, Stethoscope, Shield, Users } from 'lucide-react';

export const AboutVisionSection: React.FC = () => {
  const pillarsOfConviction = [
    {
      icon: Heart,
      title: 'FOUNDATIONAL HEALTH, NOT A NICHE',
      description:
        'Reproductive and maternal wellbeing is the bedrock of economic and generational prosperity across Africa, not an afterthought.',
    },
    {
      icon: Stethoscope,
      title: 'LOCAL CLINICAL REALITY',
      description:
        'We do not import foreign assumptions. Our platform is engineered around African epidemiological realities, diet, and healthcare distribution.',
    },
    {
      icon: Shield,
      title: 'ZERO-KNOWLEDGE PRIVACY',
      description:
        'Reproductive data is deeply personal. We implement strict client-side encryption and full compliance with the Nigeria Data Protection Act (NDPA).',
    },
    {
      icon: Users,
      title: 'INTERGENERATIONAL CONTINUITY',
      description:
        'Supporting mothers and daughters across every stage of life — from adolescence to fertility, childbirth, and menopause.',
    },
  ];

  return (
    <section id="about" className="relative w-full bg-[#0C0C0C] text-white py-24 md:py-32 px-6 sm:px-12 md:px-16 lg:px-24 font-sans select-none border-t border-neutral-900">
      
      <div className="max-w-7xl mx-auto space-y-20 relative z-10">
        
        {/* Header */}
        <div className="space-y-4 max-w-3xl">
          <div className="font-mono text-[10px] sm:text-[11px] text-crimson font-bold tracking-[0.25em] uppercase flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-crimson" />
            <span>OUR VISION &amp; PURPOSE</span>
          </div>
          <h2 className="font-display font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white tracking-[-0.03em] uppercase leading-[0.95]">
            BUILT FOR THE REALITIES OF AFRICAN CARE
          </h2>
        </div>

        {/* Narrative & Image Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Narrative Manifesto */}
          <div className="lg:col-span-7 space-y-6">
            <p className="font-sans text-base sm:text-lg md:text-xl text-neutral-200 leading-relaxed font-normal">
              Red Apple was founded to close the reproductive healthcare gap for African women — not by importing a foreign model, but by building directly for the realities of access, trust, and infrastructure on the continent.
            </p>

            <p className="font-sans text-sm sm:text-base text-neutral-400 leading-relaxed">
              We believe reproductive and fertility wellness is foundational health. Closing this gap requires intuitive digital products for women, modern telehealth tools for the doctors who treat them, and streamlined operating software for the clinics that serve them.
            </p>

            <div className="pt-4 flex flex-wrap gap-4 font-mono text-xs text-neutral-300">
              <div className="px-4 py-2 bg-neutral-900 border border-neutral-800">
                <span className="text-crimson font-bold">LAGOS</span> · NIGERIA HQ
              </div>
              <div className="px-4 py-2 bg-neutral-900 border border-neutral-800">
                <span className="text-crimson font-bold">ACCRA</span> · REGIONAL HUB
              </div>
            </div>
          </div>

          {/* Right Editorial Image Frame */}
          <div className="lg:col-span-5 relative">
            <div className="relative w-full aspect-[4/5] bg-neutral-900 border border-neutral-800 p-2 overflow-hidden shadow-2xl group">
              {/* Blank Placeholder */}
              <div className="w-full h-full bg-neutral-900" />
              <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-xs p-3 font-mono text-[9px] text-neutral-300 uppercase tracking-widest border border-white/10 flex justify-between items-center">
                <span>[ MATERNAL DIGNITY // PAN-AFRICA ]</span>
                <span className="text-crimson font-bold">2026</span>
              </div>
            </div>
          </div>

        </div>

        {/* 4 Core Pillars of Conviction */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
          {pillarsOfConviction.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="bg-neutral-950/80 border border-neutral-800/80 p-6 space-y-3">
                <div className="p-2.5 rounded-xs bg-crimson/10 border border-crimson/30 w-fit">
                  <Icon className="w-4 h-4 text-crimson" />
                </div>
                <h4 className="font-display font-black text-sm text-white uppercase tracking-tight">
                  {item.title}
                </h4>
                <p className="font-sans text-xs text-neutral-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
