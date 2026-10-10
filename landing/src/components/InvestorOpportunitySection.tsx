import React from 'react';
import { Smartphone, Stethoscope, Building2, ArrowRight, Download, Sparkles, TrendingUp } from 'lucide-react';

export const InvestorOpportunitySection: React.FC = () => {
  return (
    <section
      id="investors"
      className="relative w-full bg-white py-20 sm:py-28 md:py-36 px-6 sm:px-10 lg:px-16 font-sans border-t border-neutral-100 overflow-hidden"
    >
      <div className="max-w-5xl mx-auto space-y-14 sm:space-y-18 relative z-10">

        {/* Section Header: Extrafazant Stamp + Dual-Font Typography */}
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-block transform -rotate-6 hover:rotate-0 transition-transform mb-1 cursor-pointer">
            <div className="px-3 py-1 rounded-full border-2 border-[#E11D48] bg-white text-[#C81E3A] font-black text-xs font-sans tracking-tight shadow-2xs flex items-center gap-1.5">
              <span>SCALE &amp; ECONOMICS</span>
              <Sparkles className="w-3 h-3 text-[#E11D48]" />
            </div>
          </div>

          <p className="font-editorial italic text-base sm:text-lg text-neutral-600 tracking-tight">
            Healthcare economics &amp; maternal market scale
          </p>

          <h2 className="text-3xl sm:text-4xl md:text-[44px] font-black uppercase tracking-tight text-neutral-950 leading-[1.05]">
            <span className="font-editorial italic font-normal">WHY </span>
            <span className="font-sans font-black">RED APPLE</span>
            <span className="font-editorial font-normal italic"> MATTERS</span>
          </h2>
        </div>

        {/* 1. Macro Drivers 3-Card Grid (Styled as Collectible Framing Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-7 items-stretch">

          {/* Card 1: Electric Blue Scale */}
          <div className="group rounded-xs p-6 sm:p-7 border-2 border-[#C81E3A] bg-white shadow-md hover:shadow-xl transition-all duration-300 transform -rotate-1 hover:rotate-0 hover:-translate-y-1 flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <span className="inline-block px-2.5 py-1 rounded-xs bg-[#C81E3A]/10 text-[#C81E3A] font-mono text-[10px] font-bold uppercase tracking-wider">
                PAN-AFRICAN SCALE
              </span>
              <div className="font-editorial text-4xl sm:text-5xl text-neutral-950 font-bold tracking-tight">
                $2.44B
              </div>
              <h3 className="font-editorial text-lg text-neutral-900 font-normal leading-snug">
                Total Addressable Market
              </h3>
              <p className="font-sans text-xs text-neutral-600 leading-relaxed font-normal">
                325M internet-connected African women aged 15–49. Near-term SAM of $411.75M across Nigeria, Ghana, and Kenya.
              </p>
            </div>
            <div className="pt-3 border-t border-neutral-100 text-[10px] font-mono text-neutral-400">
              Source: UN/Worldometer &amp; Red Apple Survey
            </div>
          </div>

          {/* Card 2: Signature Crimson Clinical Need */}
          <div className="group rounded-xs p-6 sm:p-7 border-2 border-[#E11D48] bg-white shadow-md hover:shadow-xl transition-all duration-300 transform rotate-0 hover:-translate-y-1 flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <span className="inline-block px-2.5 py-1 rounded-xs bg-[#E11D48]/10 text-[#E11D48] font-mono text-[10px] font-bold uppercase tracking-wider">
                THE PREVENTIVE CRISIS
              </span>
              <div className="font-editorial text-4xl sm:text-5xl text-[#E11D48] font-bold tracking-tight">
                182,000
              </div>
              <h3 className="font-editorial text-lg text-neutral-900 font-normal leading-snug">
                African Maternal Deaths (2023)
              </h3>
              <p className="font-sans text-xs text-neutral-600 leading-relaxed font-normal">
                Africa accounts for 70% of global maternal mortality. Delayed clinical diagnosis and lack of trusted care drive this tragedy.
              </p>
            </div>
            <div className="pt-3 border-t border-neutral-100 text-[10px] font-mono text-neutral-400">
              Source: WHO Global Health Mortality
            </div>
          </div>

          {/* Card 3: Vibrant Warm Gold / Orange Traction */}
          <div className="group rounded-xs p-6 sm:p-7 border-2 border-[#C81E3A] bg-white shadow-md hover:shadow-xl transition-all duration-300 transform rotate-1 hover:rotate-0 hover:-translate-y-1 flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <span className="inline-block px-2.5 py-1 rounded-xs bg-[#C81E3A]/10 text-[#C81E3A] font-mono text-[10px] font-bold uppercase tracking-wider">
                PRE-LAUNCH VALIDATION
              </span>
              <div className="font-editorial text-4xl sm:text-5xl text-neutral-950 font-bold tracking-tight">
                82.9%
              </div>
              <h3 className="font-editorial text-lg text-neutral-900 font-normal leading-snug">
                Rated Extremely Useful
              </h3>
              <p className="font-sans text-xs text-neutral-600 leading-relaxed font-normal">
                73.9% of surveyed women confirmed willingness to pay monthly for premium care; 327 organic waitlist signups in our first 4 days.
              </p>
            </div>
            <div className="pt-3 border-t border-neutral-100 text-[10px] font-mono text-neutral-400">
              Source: Red Apple User Survey &amp; Organic Waitlist
            </div>
          </div>

        </div>

        {/* 2. THE CONNECTED SYSTEM FLYWHEEL */}
        <div className="rounded-xs border border-neutral-200 bg-neutral-50/70 p-7 sm:p-10 space-y-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-neutral-200">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#C81E3A]">
                THE UNIFIED FLYWHEEL
              </span>
              <h3 className="font-editorial text-2xl sm:text-3xl text-neutral-950 font-normal mt-1">
                From daily cycle tracking to lifelong clinic trust.
              </h3>
            </div>
            <p className="text-xs text-neutral-600 max-w-sm leading-relaxed">
              Standalone apps lose retention; standalone clinics lack digital touchpoints. Red Apple connects both in a self-reinforcing circle.
            </p>
          </div>

          {/* 3 Connected Flywheel Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            <div className="bg-white p-5 rounded-xs border border-neutral-200/80 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xs bg-[#C81E3A]/10 text-[#C81E3A] flex items-center justify-center font-bold text-xs">
                  01
                </span>
                <Smartphone className="w-4 h-4 text-[#C81E3A]" />
              </div>
              <h4 className="font-editorial text-lg text-neutral-900 font-normal">
                Organic Consumer App
              </h4>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Daily period &amp; ovulation tracking builds baseline biomarker records and high consumer retention.
              </p>
              <div className="pt-1 text-[#C81E3A] text-[11px] font-bold flex items-center gap-1">
                <span>Feeds Telemedicine</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xs border border-neutral-200/80 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xs bg-[#C81E3A]/10 text-[#C81E3A] flex items-center justify-center font-bold text-xs">
                  02
                </span>
                <Stethoscope className="w-4 h-4 text-[#C81E3A]" />
              </div>
              <h4 className="font-editorial text-lg text-neutral-900 font-normal">
                On-Demand Specialist Care
              </h4>
              <p className="text-xs text-neutral-600 leading-relaxed">
                When irregular cycles or antenatal questions arise, users book verified OB-GYNs within hours.
              </p>
              <div className="pt-1 text-[#C81E3A] text-[11px] font-bold flex items-center gap-1">
                <span>Refers to Accredited Clinics</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xs border border-neutral-200/80 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xs bg-[#C81E3A]/10 text-[#C81E3A] flex items-center justify-center font-bold text-xs">
                  03
                </span>
                <Building2 className="w-4 h-4 text-[#C81E3A]" />
              </div>
              <h4 className="font-editorial text-lg text-neutral-900 font-normal">
                Clinic &amp; Hospital EMR
              </h4>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Physical clinics run Red Apple OS for antenatal records, retaining mothers throughout pregnancy and birth.
              </p>
              <div className="pt-1 text-[#C81E3A] text-[11px] font-bold flex items-center gap-1">
                <span>Generates Lifetime Value</span>
                <TrendingUp className="w-3 h-3" />
              </div>
            </div>

          </div>

          {/* Bottom Action inside Flywheel */}
          <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-neutral-200">
            <span className="font-editorial italic text-sm text-neutral-700">
              Partner with us to build Africa’s foundational reproductive health infrastructure.
            </span>

            <a
              href="/contact"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xs bg-neutral-950 text-white font-bold text-xs uppercase tracking-wider hover:bg-[#C81E3A] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Request Briefing Deck</span>
            </a>
          </div>
        </div>

      </div>
    </section>
  );
};
