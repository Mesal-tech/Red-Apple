import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';

interface PillarItem {
  id: string;
  num: string;
  title: string;
  description: string;
}

const PILLARS: PillarItem[] = [
  {
    id: 'innovation',
    num: '01.',
    title: 'INNOVATION',
    description:
      'Red Apple transforms reproductive care into proactive clinical intelligence. We anticipate clinical needs through AI risk triage and cycle tracking, detecting complications long before emergencies arise.',
  },
  {
    id: 'quality',
    num: '02.',
    title: 'QUALITY',
    description:
      'We are truly committed to quality. We guarantee clinical protocols that are rigorously validated, certified, and developed, always focusing on patient safety, confidentiality, and reliability.',
  },
  {
    id: 'efficiency',
    num: '03.',
    title: 'EFFICIENCY',
    description:
      'Eliminating diagnostic delays and waiting queues. Instant risk categorization routes urgent maternal cases directly to frontline clinicians within minutes.',
  },
  {
    id: 'competence',
    num: '04.',
    title: 'COMPETENCE',
    description:
      'Built by African medical specialists for African women. Over 180+ verified OB-GYNs, certified midwives, and clinicians deliver peer-reviewed care with dignity.',
  },
  {
    id: 'sustainability',
    num: '05.',
    title: 'SUSTAINABILITY',
    description:
      'Creating enduring generational wellness across communities through continuous preventive education, sovereign health records, and maternal support circles.',
  },
];

export const IntroMissionSection: React.FC = () => {
  // Default to items 01 and 02 expanded to match the reference layout
  const [expandedItems, setExpandedItems] = useState<string[]>(['innovation', 'quality']);

  const toggleItem = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <section
      id="intro"
      className="relative w-full h-[100vh] flex flex-col justify-center bg-white py-10 sm:py-14 lg:py-16 px-4 sm:px-6 lg:px-8 overflow-visible font-sans select-none"
    >
      <div className="max-w-4xl lg:max-w-[960px] xl:max-w-[1000px] mx-auto relative">

        {/* CASCADING LAYERED CARD DECK CONTAINER */}
        <div className="relative w-full rounded-[24px] sm:rounded-[28px] overflow-hidden shadow-[0_20px_45px_rgba(200,30,58,0.22)]">

          {/* ========================================================================= */}
          {/* LAYER 1: MAIN ACTIVE TOP CARD */}
          {/* ========================================================================= */}
          <div className="relative z-10 w-full bg-[#C81E3A] text-white p-6 sm:p-8 lg:p-9">

            <div className="flex flex-col md:flex-row items-start justify-between gap-8 md:gap-12">

              {/* LEFT COLUMN: Headline & Methodology CTA */}
              <div className="w-full md:w-[42%] lg:w-[40%] flex flex-col justify-between shrink-0">

                {/* Compact, Punchy Headline */}
                <h2 className="font-sans font-semibold text-2xl sm:text-[28px] md:text-[34px] text-white tracking-[-0.03em] leading-[1.12] mb-5 sm:mb-6">
                  For those who<br />
                  demand more<br />
                  from healthcare.
                </h2>

                {/* Subtle Action Link */}
                <div className="pt-2">
                  <a
                    href="/about"
                    className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-red-100 hover:text-white transition-colors group"
                    aria-label="Learn more about Red Apple's team and methodology"
                  >
                    <span>LEARN OUR METHODOLOGY</span>
                    <ArrowRight className="w-3 h-3 text-red-200 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </a>
                </div>

              </div>

              {/* RIGHT COLUMN: Numbered Pillars Accordion (01, 02, 03) */}
              <div className="w-full md:w-[58%] lg:w-[60%] space-y-3.5 sm:space-y-4">
                {PILLARS.slice(0, 3).map((pillar) => {
                  const isExpanded = expandedItems.includes(pillar.id);

                  return (
                    <div
                      key={pillar.id}
                      className="group cursor-pointer transition-colors"
                      onClick={() => toggleItem(pillar.id)}
                    >
                      {/* Number & Title Header */}
                      <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold tracking-[0.12em] uppercase text-white/95 group-hover:text-white transition-colors">
                        <span className="text-white font-bold">{pillar.num}</span>
                        <span>{pillar.title}</span>
                      </div>

                      {/* Expandable Paragraph Description */}
                      <div
                        className={`grid transition-all duration-300 ease-in-out ${
                          isExpanded
                            ? 'grid-rows-[1fr] opacity-100 pt-1.5 pb-1'
                            : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                        }`}
                      >
                        <div className="overflow-hidden">
                          <p className="text-[11.5px] sm:text-xs text-red-100/95 font-sans font-normal leading-relaxed max-w-xl">
                            {pillar.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

          </div>

          {/* ========================================================================= */}
          {/* LAYER 4: CARD 4 TAB (COMPETENCE) */}
          {/* ========================================================================= */}
          <div
            onClick={() => toggleItem('competence')}
            className="group relative z-[8] w-full pt-4 sm:pt-5 pb-3 sm:pb-3.5 px-6 sm:px-8 lg:px-9 bg-[#A3142C] text-white border-t border-white/15 cursor-pointer transition-colors duration-200 hover:bg-[#B11732] flex flex-col"
          >
            <div className="flex items-center justify-between">
              <span className="font-sans font-bold text-[11px] sm:text-xs tracking-[0.12em] uppercase text-white/95 group-hover:text-white flex items-center gap-2 transition-colors">
                <span className="text-white font-bold">04.</span>
                <span>COMPETENCE</span>
              </span>
            </div>

            {/* Expandable description if active */}
            <div
              className={`grid transition-all duration-300 ease-in-out ${
                expandedItems.includes('competence')
                  ? 'grid-rows-[1fr] opacity-100 pt-1.5 pb-1'
                  : 'grid-rows-[0fr] opacity-0 pointer-events-none'
              }`}
            >
              <div className="overflow-hidden">
                <p className="text-[11.5px] sm:text-xs text-red-100/95 font-sans font-normal leading-relaxed max-w-xl">
                  {PILLARS.find((p) => p.id === 'competence')?.description}
                </p>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* LAYER 5: CARD 5 TAB (SUSTAINABILITY) */}
          {/* ========================================================================= */}
          <div
            onClick={() => toggleItem('sustainability')}
            className="group relative z-[6] w-full pt-4 sm:pt-5 pb-4 sm:pb-5 px-6 sm:px-8 lg:px-9 bg-[#7D0E20] text-white border-t border-white/15 cursor-pointer transition-colors duration-200 hover:bg-[#8D1126] flex flex-col"
          >
            <div className="flex items-center justify-between">
              <span className="font-sans font-bold text-[11px] sm:text-xs tracking-[0.12em] uppercase text-white/95 group-hover:text-white flex items-center gap-2 transition-colors">
                <span className="text-white font-bold">05.</span>
                <span>SUSTAINABILITY</span>
              </span>
            </div>

            {/* Expandable description if active */}
            <div
              className={`grid transition-all duration-300 ease-in-out ${
                expandedItems.includes('sustainability')
                  ? 'grid-rows-[1fr] opacity-100 pt-1.5 pb-1'
                  : 'grid-rows-[0fr] opacity-0 pointer-events-none'
              }`}
            >
              <div className="overflow-hidden">
                <p className="text-[11.5px] sm:text-xs text-red-100/95 font-sans font-normal leading-relaxed max-w-xl">
                  {PILLARS.find((p) => p.id === 'sustainability')?.description}
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
