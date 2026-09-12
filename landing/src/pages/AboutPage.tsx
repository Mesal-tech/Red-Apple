import React, { useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { Heart, Stethoscope, Shield, Users, ArrowLeft, ArrowRight, Award, CheckCircle2 } from 'lucide-react';

interface AboutPageProps {
  onNavigateHome: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigateHome }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const convictions = [
    {
      icon: Heart,
      title: 'FOUNDATIONAL HEALTH, NOT A NICHE',
      description:
        'Reproductive and maternal wellbeing is the fundamental bedrock of economic and generational prosperity across Africa. We treat it as critical infrastructure.',
    },
    {
      icon: Stethoscope,
      title: 'BUILT FOR AFRICAN CLINICAL REALITY',
      description:
        'We refuse to import foreign assumptions. Our platform is engineered around African epidemiological realities, maternal nutrition, and local healthcare distribution.',
    },
    {
      icon: Shield,
      title: 'ZERO-KNOWLEDGE PRIVACY BY DEFAULT',
      description:
        'Reproductive data is sacred. We implement client-side encryption, strict zero-knowledge architecture, and full compliance with the Nigeria Data Protection Act (NDPA).',
    },
    {
      icon: Users,
      title: 'INTERGENERATIONAL CONTINUITY OF CARE',
      description:
        'Supporting African women across every chapter of life — from adolescence to cycle management, fertility, pregnancy, birth, and postpartum wellness.',
    },
  ];

  const advisors = [
    {
      name: 'Dr. Folashade Adeleke, MD, FWACS',
      role: 'Chief Clinical Advisor — Obstetrics & Gynecology',
      bio: 'Senior Consultant OB-GYN with 18+ years leading maternal mortality reduction programs across West Africa.',
      credentials: 'MBBS (Ib), FWACS, FMCOG',
    },
    {
      name: 'Dr. Chinedu Okafor, MD, MRCOG',
      role: 'Director of Reproductive Endocrinology',
      bio: 'Specialist in assisted reproduction and hormonal diagnostics, pioneering affordable fertility protocols in Sub-Saharan Africa.',
      credentials: 'MRCOG (UK), MSc Clinical Embryology',
    },
    {
      name: 'Amina Bello, RN, RM, MPH',
      role: 'Head of Midwifery & Community Health Outreach',
      bio: '20+ years training community midwives and implementing rural antenatal triage networks in Northern Nigeria.',
      credentials: 'BSc Midwifery, MPH (Health Systems)',
    },
    {
      name: 'Kofi Mensah, PhD',
      role: 'Lead Health Informatics & Data Security',
      bio: 'Former healthcare systems architect specializing in NDPA/HIPAA-compliant zero-knowledge health record distribution.',
      credentials: 'PhD Distributed Systems, CISSP',
    },
  ];

  return (
    <div className="w-full min-h-screen bg-[#070707] text-white font-sans select-none overflow-x-hidden">
      
      {/* Editorial Navigation */}
      <Navbar brandName="RED APPLE" />

      {/* ========================================================================= */}
      {/* 1. ABOUT HERO SECTION */}
      {/* ========================================================================= */}
      <section className="relative w-full pt-36 md:pt-48 pb-20 px-6 sm:px-12 md:px-16 lg:px-24 border-b border-neutral-900 overflow-hidden bg-gradient-to-b from-[#0C0C0C] to-[#070707]">
        
        {/* Background Ambient Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-crimson/10 rounded-full blur-[160px] pointer-events-none" />

        <div className="max-w-7xl mx-auto space-y-8 relative z-10">
          
          <button
            onClick={onNavigateHome}
            className="inline-flex items-center gap-2 font-mono text-xs text-neutral-400 hover:text-crimson transition-colors cursor-pointer uppercase tracking-wider group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Home</span>
          </button>

          <div className="space-y-4 max-w-4xl">
            <div className="font-mono text-[10px] sm:text-[11px] text-crimson font-bold tracking-[0.25em] uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-crimson animate-pulse" />
              <span>ABOUT RED APPLE // OUR STORY &amp; PURPOSE</span>
            </div>

            <h1 className="font-display font-black text-3xl sm:text-5xl md:text-6xl lg:text-7xl text-white tracking-[-0.03em] uppercase leading-[0.95]">
              BUILT FOR THE REALITIES OF AFRICAN CARE.
            </h1>

            <p className="font-sans text-base sm:text-lg md:text-xl text-neutral-300 leading-relaxed max-w-3xl pt-2 font-normal">
              Red Apple was founded to close the reproductive healthcare gap for African women — not by importing a foreign model, but by building directly for the realities of access, trust, and infrastructure on the continent.
            </p>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. THE ORIGIN STORY & THE GAP WE SOLVE */}
      {/* ========================================================================= */}
      <section className="relative w-full py-24 md:py-32 px-6 sm:px-12 md:px-16 lg:px-24 border-b border-neutral-900 bg-[#070707]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Narrative */}
          <div className="lg:col-span-7 space-y-6">
            <div className="font-mono text-[10px] sm:text-[11px] text-neutral-400 font-bold tracking-widest uppercase">
              [ THE REALITY OF THE CONTINENT ]
            </div>

            <h2 className="font-display font-black text-2xl sm:text-3xl md:text-4xl text-white tracking-tight uppercase leading-tight">
              WHY STANDALONE SOLUTIONS FAIL AFRICAN WOMEN
            </h2>

            <div className="space-y-4 text-sm sm:text-base text-neutral-300 font-sans leading-relaxed">
              <p>
                Across Sub-Saharan Africa, reproductive and maternal healthcare remains profoundly fragmented. Cycle and fertility information is scarce and often stigmatized, certified specialist doctors are concentrated in a handful of tier-one cities, and the physical clinics serving women often run entirely on paper files.
              </p>

              <p>
                Most health-tech platforms attempt to solve only one piece in isolation — a consumer tracking app with foreign language assumptions, an isolated video hotline, or complex clinic software that goes unused.
              </p>

              <p className="text-white font-semibold">
                Red Apple connects all three pieces as one unified ecosystem: consumer wellness, specialist telemedicine, and clinical operating software.
              </p>
            </div>

            {/* Key stats */}
            <div className="pt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-neutral-800">
              <div className="space-y-1">
                <div className="font-display font-black text-2xl sm:text-3xl text-white">300M+</div>
                <div className="font-mono text-[10px] text-neutral-400 uppercase">African Women Reached</div>
              </div>
              <div className="space-y-1">
                <div className="font-display font-black text-2xl sm:text-3xl text-crimson">100%</div>
                <div className="font-mono text-[10px] text-neutral-400 uppercase">Encrypted Care</div>
              </div>
              <div className="space-y-1">
                <div className="font-display font-black text-2xl sm:text-3xl text-white">3-in-1</div>
                <div className="font-mono text-[10px] text-neutral-400 uppercase">Unified Ecosystem</div>
              </div>
            </div>
          </div>

          {/* Right Image Frame */}
          <div className="lg:col-span-5 relative">
            <div className="relative w-full aspect-[4/5] bg-neutral-900 border border-neutral-800 p-2 overflow-hidden shadow-2xl">
              <img
                src="/red-apple-family.jpg"
                alt="African Maternal Healthcare Dignity"
                className="w-full h-full object-cover filter grayscale contrast-125 brightness-95"
              />
              <div className="absolute bottom-4 left-4 right-4 bg-black/85 backdrop-blur-xs p-3 font-mono text-[9px] text-neutral-300 uppercase tracking-widest border border-white/10 flex justify-between items-center">
                <span>[ AFRICAN MATERNAL CONTINUITY ]</span>
                <span className="text-crimson font-bold">EST. 2025</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. FOUR PILLARS OF CONVICTION */}
      {/* ========================================================================= */}
      <section className="relative w-full py-24 md:py-32 px-6 sm:px-12 md:px-16 lg:px-24 border-b border-neutral-900 bg-[#0C0C0C]">
        <div className="max-w-7xl mx-auto space-y-16">
          
          <div className="space-y-3 max-w-2xl">
            <div className="font-mono text-[10px] sm:text-[11px] text-crimson font-bold tracking-[0.25em] uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-crimson" />
              <span>CORE VALUES</span>
            </div>
            <h2 className="font-display font-black text-3xl sm:text-4xl md:text-5xl text-white tracking-[-0.03em] uppercase leading-[0.95]">
              OUR PILLARS OF CONVICTION
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {convictions.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="bg-neutral-950/90 border border-neutral-800 p-8 space-y-4 relative group hover:border-neutral-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-xs bg-crimson/10 border border-crimson/30">
                      <Icon className="w-5 h-5 text-crimson" />
                    </div>
                    <span className="font-mono text-xs font-bold text-neutral-400">0{idx + 1}</span>
                  </div>

                  <h3 className="font-display font-black text-lg sm:text-xl text-white uppercase tracking-tight">
                    {item.title}
                  </h3>

                  <p className="font-sans text-xs sm:text-sm text-neutral-300 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. CLINICAL ADVISORY COUNCIL */}
      {/* ========================================================================= */}
      <section className="relative w-full py-24 md:py-32 px-6 sm:px-12 md:px-16 lg:px-24 border-b border-neutral-900 bg-[#070707]">
        <div className="max-w-7xl mx-auto space-y-16">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-neutral-800">
            <div className="space-y-3 max-w-2xl">
              <div className="font-mono text-[10px] sm:text-[11px] text-crimson font-bold tracking-[0.25em] uppercase flex items-center gap-2">
                <Award className="w-3.5 h-3.5 text-crimson" />
                <span>CLINICAL EXCELLENCE</span>
              </div>
              <h2 className="font-display font-black text-3xl sm:text-4xl md:text-5xl text-white tracking-[-0.03em] uppercase leading-[0.95]">
                MEDICAL ADVISORY COUNCIL
              </h2>
            </div>
            <p className="max-w-md font-sans text-xs sm:text-sm text-neutral-400 leading-relaxed">
              Every algorithm, clinical guideline, and patient pathway in Red Apple is vetted by certified African medical leaders.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {advisvisorsLoop(advisors)}
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. LOCATIONS & PAN-AFRICAN REACH */}
      {/* ========================================================================= */}
      <section className="relative w-full py-20 px-6 sm:px-12 md:px-16 lg:px-24 border-b border-neutral-900 bg-[#0C0C0C]">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="font-mono text-[10px] sm:text-[11px] text-neutral-400 font-bold tracking-widest uppercase">
            [ REGIONAL OFFICES &amp; HUBS ]
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-display font-black text-2xl text-white uppercase">LAGOS, NIGERIA</h3>
                <span className="font-mono text-[10px] text-crimson font-bold px-2 py-0.5 bg-crimson/10 border border-crimson/30">HQ &amp; CLINICAL LAB</span>
              </div>
              <p className="font-sans text-xs sm:text-sm text-neutral-400 leading-relaxed">
                Victoria Island, Lagos. Overseeing software engineering, medical advisory board, and clinic partner operations.
              </p>
            </div>

            <div className="p-8 bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-display font-black text-2xl text-white uppercase">ACCRA, GHANA</h3>
                <span className="font-mono text-[10px] text-neutral-400 font-bold px-2 py-0.5 bg-neutral-900 border border-neutral-800">WEST AFRICA HUB</span>
              </div>
              <p className="font-sans text-xs sm:text-sm text-neutral-400 leading-relaxed">
                Airport Residential Area, Accra. Coordinating regional telemedicine provider networks and maternal health partnerships.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. CLOSING ACTION CTA */}
      {/* ========================================================================= */}
      <section className="relative w-full py-24 px-6 sm:px-12 md:px-16 lg:px-24 bg-[#070707] text-center space-y-8">
        <div className="max-w-3xl mx-auto space-y-4">
          <h2 className="font-display font-black text-3xl sm:text-4xl md:text-5xl text-white uppercase tracking-tight">
            JOIN US IN RESHAPING AFRICAN HEALTHCARE
          </h2>
          <p className="font-sans text-sm sm:text-base text-neutral-400 leading-relaxed">
            Whether you are an investor, doctor, or clinic operator, discover how Red Apple can empower your patients.
          </p>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-4">
          <button
            onClick={onNavigateHome}
            className="px-8 py-3.5 bg-crimson text-white font-mono text-xs font-bold uppercase tracking-wider hover:bg-crimson/90 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-crimson/20"
          >
            <span>Explore Platform on Home</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Global Footer */}
      <Footer />

    </div>
  );
};

function advisvisorsLoop(advisors: any[]) {
  return advisors.map((adv, idx) => (
    <div key={idx} className="bg-neutral-950/80 border border-neutral-800 p-6 sm:p-8 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-display font-black text-lg text-white uppercase">{adv.name}</h3>
          <p className="font-mono text-xs text-crimson pt-0.5">{adv.role}</p>
        </div>
        <span className="font-mono text-[9px] text-neutral-400 bg-neutral-900 px-2 py-0.5 border border-neutral-800">{adv.credentials}</span>
      </div>
      <p className="font-sans text-xs sm:text-sm text-neutral-400 leading-relaxed">{adv.bio}</p>
      <div className="pt-2 flex items-center gap-1.5 font-mono text-[10px] text-emerald-500">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>BOARD CERTIFIED ACTIVE SPECIALIST</span>
      </div>
    </div>
  ));
}
