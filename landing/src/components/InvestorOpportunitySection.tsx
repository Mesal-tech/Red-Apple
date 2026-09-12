import React from 'react';
import { TrendingUp, Layers, Smartphone, Stethoscope, Building2, ArrowRight, Download, Users } from 'lucide-react';

export const InvestorOpportunitySection: React.FC = () => {
  return (
    <section id="investors" className="relative w-full bg-[#080808] text-white py-24 md:py-32 px-6 sm:px-12 md:px-16 lg:px-24 font-sans select-none border-t border-neutral-900 overflow-hidden">
      
      {/* Background Grid Pattern Accent */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f12_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f12_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-20 relative z-10">
        
        {/* Header */}
        <div className="space-y-4 max-w-3xl">
          <div className="font-mono text-[10px] sm:text-[11px] text-crimson font-bold tracking-[0.25em] uppercase flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-crimson" />
            <span>THE OPPORTUNITY // INVESTOR BRIEF</span>
          </div>
          <h2 className="font-display font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white tracking-[-0.03em] uppercase leading-[0.95]">
            WHY NOW &amp; WHY RED APPLE
          </h2>
          <p className="font-sans text-sm sm:text-base text-neutral-400 leading-relaxed">
            Reproductive and fertility wellness is Africa's largest under-capitalized health sector. We are transforming fragmented care into a connected digital infrastructure.
          </p>
        </div>

        {/* 1. "WHY NOW" Macro Drivers Bento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-neutral-950/80 border border-neutral-800/80 p-8 space-y-4 relative group hover:border-neutral-700 transition-colors">
            <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest">[ MACRO DEMAND ]</div>
            <div className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight">
              300M+
            </div>
            <h3 className="font-display font-black text-base uppercase text-neutral-200">
              Women of Reproductive Age
            </h3>
            <p className="font-sans text-xs text-neutral-400 leading-relaxed">
              Across Sub-Saharan Africa, fertility and reproductive specialist care is currently concentrated in a tiny fraction of urban centers, leaving massive unmet demand.
            </p>
            <div className="pt-2 font-mono text-[9px] text-neutral-400 uppercase">
              SOURCE: WHO / UNFPA REGIONAL DEMOGRAPHIC METRICS
            </div>
          </div>

          <div className="bg-neutral-950/80 border border-neutral-800/80 p-8 space-y-4 relative group hover:border-neutral-700 transition-colors">
            <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest">[ CAPITAL GAP ]</div>
            <div className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight">
              $1.2B+
            </div>
            <h3 className="font-display font-black text-base uppercase text-neutral-200">
              Under-Capitalized Health Category
            </h3>
            <p className="font-sans text-xs text-neutral-400 leading-relaxed">
              While general African fintech and health-tech have seen rapid venture growth, reproductive and maternal infrastructure remains severely under-indexed relative to population scale.
            </p>
            <div className="pt-2 font-mono text-[9px] text-neutral-400 uppercase">
              SOURCE: PARTECH &amp; DISRUPT AFRICA HEALTH REPORTS
            </div>
          </div>

          <div className="bg-neutral-950/80 border border-neutral-800/80 p-8 space-y-4 relative group hover:border-neutral-700 transition-colors">
            <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest">[ INFRASTRUCTURE READY ]</div>
            <div className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight">
              72%+
            </div>
            <h3 className="font-display font-black text-base uppercase text-neutral-200">
              Smartphone &amp; Mobile Money Reach
            </h3>
            <p className="font-sans text-xs text-neutral-400 leading-relaxed">
              High mobile device adoption and seamless digital payments now make full-stack, direct-to-consumer digital health ecosystems viable and scalable across urban and peri-urban hubs.
            </p>
            <div className="pt-2 font-mono text-[9px] text-neutral-400 uppercase">
              SOURCE: GSMA SUB-SAHARAN AFRICA ECONOMY REPORT
            </div>
          </div>

        </div>

        {/* 2. "WHY RED APPLE" — The Connected System Flywheel */}
        <div className="bg-neutral-950 border border-neutral-800 p-8 sm:p-12 md:p-16 space-y-12">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="font-mono text-[10px] text-crimson font-bold uppercase tracking-widest flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-crimson" />
                <span>OUR MOAT &amp; DISTRIBUTION ADVANTAGE</span>
              </div>
              <h3 className="font-display font-black text-2xl sm:text-3xl md:text-4xl text-white tracking-tight uppercase leading-tight">
                THE UNIFIED FLYWHEEL ADVANTAGE
              </h3>
            </div>
            <p className="max-w-md font-sans text-xs sm:text-sm text-neutral-400 leading-relaxed">
              Single-point solutions (standalone trackers, isolated hotlines, or siloed clinic tools) struggle with churn and CAC. Red Apple links all three into a self-reinforcing flywheel.
            </p>
          </div>

          {/* Flywheel Interactive Steps Diagram */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            
            {/* Step 1 */}
            <div className="bg-neutral-900/60 border border-neutral-800 p-6 space-y-4 relative">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xs bg-crimson/10 border border-crimson/30">
                  <Smartphone className="w-5 h-5 text-crimson" />
                </div>
                <span className="font-mono text-xs font-bold text-neutral-400">STAGE 01</span>
              </div>
              <h4 className="font-display font-black text-lg text-white uppercase tracking-tight">
                Consumer App Adoption
              </h4>
              <p className="font-sans text-xs text-neutral-400 leading-relaxed">
                Women onboard organically for cycle and ovulation tracking, generating trust, daily engagement, and longitudinal reproductive biomarkers.
              </p>
              <div className="pt-2 text-crimson font-mono text-[10px] font-bold flex items-center gap-1.5">
                <span>FEEDS TELEHEALTH DEMAND</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-neutral-900/60 border border-neutral-800 p-6 space-y-4 relative">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xs bg-crimson/10 border border-crimson/30">
                  <Stethoscope className="w-5 h-5 text-crimson" />
                </div>
                <span className="font-mono text-xs font-bold text-neutral-400">STAGE 02</span>
              </div>
              <h4 className="font-display font-black text-lg text-white uppercase tracking-tight">
                Telehealth Consultations
              </h4>
              <p className="font-sans text-xs text-neutral-400 leading-relaxed">
                When irregular cycles, fertility issues, or pregnancies arise, users transition seamlessly into on-demand consultations with vetted OB-GYNs.
              </p>
              <div className="pt-2 text-crimson font-mono text-[10px] font-bold flex items-center gap-1.5">
                <span>DRIVES CLINIC ADOPTION</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-neutral-900/60 border border-neutral-800 p-6 space-y-4 relative">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xs bg-crimson/10 border border-crimson/30">
                  <Building2 className="w-5 h-5 text-crimson" />
                </div>
                <span className="font-mono text-xs font-bold text-neutral-400">STAGE 03</span>
              </div>
              <h4 className="font-display font-black text-lg text-white uppercase tracking-tight">
                Red Apple OS for Clinics
              </h4>
              <p className="font-sans text-xs text-neutral-400 leading-relaxed">
                Partner clinics adopt Red Apple OS to manage physical appointments, digitize paper records, and receive referred telehealth patients.
              </p>
              <div className="pt-2 text-emerald-400 font-mono text-[10px] font-bold flex items-center gap-1.5">
                <span>LOCKS IN CONTINUITY OF CARE</span>
                <TrendingUp className="w-3 h-3" />
              </div>
            </div>

          </div>

          {/* Investor Call to Action Bar */}
          <div className="pt-6 border-t border-neutral-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <h4 className="font-display font-black text-xl text-white uppercase">
                PARTNER WITH US TO BUILD AFRICA’S REPRODUCTIVE INFRASTRUCTURE
              </h4>
              <p className="font-mono text-xs text-neutral-400 pt-1">
                Seed round open to strategic healthcare &amp; venture partners.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 shrink-0">
              <a
                href="#contact"
                className="px-6 py-3 bg-white text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-neutral-200 transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-crimson" />
                <span>Request Our Deck</span>
              </a>

              <a
                href="#contact"
                className="px-6 py-3 bg-neutral-900 border border-neutral-700 text-white font-mono text-xs font-bold uppercase tracking-wider hover:border-crimson transition-all flex items-center gap-2"
              >
                <Users className="w-4 h-4 text-crimson" />
                <span>Speak With Founders</span>
              </a>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
