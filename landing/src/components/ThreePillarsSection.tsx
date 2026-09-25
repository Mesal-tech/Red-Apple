import React, { useState, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Smartphone, Stethoscope, Building2, ArrowUpRight, CheckCircle2, ShieldCheck } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export const ThreePillarsSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const containerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current || !contentRef.current) return;

      // Parallax usher-in as this light section slides up over the pinned previous video section
      gsap.fromTo(
        contentRef.current,
        { y: 120, opacity: 0.8 },
        {
          y: 0,
          opacity: 1,
          ease: 'power1.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top bottom',
            end: 'top top',
            scrub: 1.0,
          },
        }
      );
    },
    { scope: containerRef }
  );

  const pillars = [
    {
      id: 'app',
      tag: '01 // CONSUMER PLATFORM',
      name: 'RED APPLE APP',
      category: 'Everyday Wellness & Cycle Intelligence',
      headline: 'Cycle tracking, contraception guidance, and fertility education built for African women.',
      description:
        'Engineered in plain language with culturally relevant context on nutrition, reproductive biology, and local clinical realities. Empowers women to understand their fertile windows, hormonal shifts, and antenatal milestones.',
      metrics: [
        { value: '50K+', label: 'APP DOWNLOADS' },
        { value: '6+', label: 'ACTIVE COUNTRIES' },
        { value: '78%', label: 'MONTHLY RETENTION' },
      ],
      features: [
        'AI-driven ovulation & fertile window forecasting',
        'Localized African nutrition & reproductive health guides',
        'Doctor-verified contraception & symptom tracker',
        'Offline-first architecture with end-to-end encryption',
      ],
      badge: 'CONSUMER iOS & ANDROID',
      icon: Smartphone,
    },
    {
      id: 'connect',
      tag: '02 // TELEHEALTH LAYER',
      name: 'RED APPLE CONNECT',
      category: 'Specialist Telemedicine Network',
      headline: 'On-demand video and chat consultations with vetted OB-GYNs and fertility specialists.',
      description:
        'Closing the geographic and social distance between African women and high-caliber maternal care. Patients can schedule encrypted video sessions, receive electronic prescriptions, and access specialist triage within hours.',
      metrics: [
        { value: '180+', label: 'VETTED SPECIALISTS' },
        { value: '15K+', label: 'CONSULTATIONS BOOKED' },
        { value: '< 2 hrs', label: 'AVG. TIME TO APPOINTMENT' },
      ],
      features: [
        'Board-certified gynecologists, endocrinologists & midwives',
        'Low-bandwidth HD video calls optimized for 3G/4G',
        'Direct electronic prescriptions to licensed local pharmacies',
        'Secure patient-doctor clinical messaging',
      ],
      badge: 'ON-DEMAND TELEMEDICINE',
      icon: Stethoscope,
    },
    {
      id: 'os',
      tag: '03 // CLINICAL TECHNOLOGY',
      name: 'RED APPLE OS',
      category: 'Practice & EHR Infrastructure',
      headline: 'Patient records, appointment management, and workflow tools purpose-built for fertility clinics.',
      description:
        'Replacing stacks of physical paper files with intuitive, modern clinical software that African clinics actually want to use. Seamlessly connects clinic workflows with consumer telehealth and remote patient monitoring.',
      metrics: [
        { value: '45+', label: 'CLINICS ONBOARDED' },
        { value: '120K+', label: 'PATIENT RECORDS DIGITIZED' },
        { value: '64%', label: 'ADMIN TIME REDUCTION' },
      ],
      features: [
        'Automated antenatal appointment scheduling & SMS alerts',
        'Zero-knowledge encrypted electronic health records (EHR)',
        'Fertility cycle charting & lab result integration',
        'Billing, insurance claim tracking, and reporting analytics',
      ],
      badge: 'CLINIC SAAS PLATFORM',
      icon: Building2,
    },
  ];

  const currentPillar = pillars[activeTab];
  const IconComponent = currentPillar.icon;

  return (
    <section
      id="products"
      ref={containerRef}
      className="relative w-full z-40 bg-[#FBFBFA] text-neutral-900 py-24 md:py-32 px-6 sm:px-12 md:px-16 lg:px-24 font-sans select-none border-t border-neutral-300 shadow-[0_-50px_100px_rgba(0,0,0,0.7)]"
    >
      {/* Subtle Background Accent */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-crimson/[0.03] rounded-full blur-[140px] pointer-events-none" />

      <div ref={contentRef} className="max-w-7xl mx-auto space-y-16 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-neutral-200">
          <div className="space-y-3 max-w-2xl">
            <div className="font-mono text-[10px] sm:text-[11px] text-crimson font-bold tracking-[0.25em] uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-crimson" />
              <span>THE THREE CONNECTED PILLARS</span>
            </div>
            <h2 className="font-display font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-neutral-950 tracking-[-0.03em] uppercase leading-[0.95]">
              WE’RE DOING THIS THROUGH
            </h2>
          </div>
          
          <div className="max-w-md font-sans text-xs sm:text-sm text-neutral-600 leading-relaxed">
            One unified ecosystem connecting African women, remote reproductive specialists, and physical healthcare clinics end-to-end.
          </div>
        </div>

        {/* Pillar Switcher Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {pillars.map((pillar, idx) => {
            const isActive = activeTab === idx;
            return (
              <button
                key={pillar.id}
                onClick={() => setActiveTab(idx)}
                className={`text-left p-5 md:p-6 transition-all duration-200 border flex flex-col justify-between h-full cursor-pointer relative group ${
                  isActive
                    ? 'bg-white border-crimson shadow-[0_12px_30px_rgba(230,0,38,0.08)]'
                    : 'bg-white/80 border-neutral-200 hover:border-neutral-300 hover:bg-white'
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-crimson" />
                )}
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[9px] sm:text-[10px] text-neutral-500 font-bold tracking-widest uppercase">
                      {pillar.tag}
                    </span>
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 uppercase tracking-wider rounded-xs ${
                      isActive ? 'bg-crimson/10 text-crimson font-bold' : 'text-neutral-400 bg-neutral-100'
                    }`}>
                      0{idx + 1}
                    </span>
                  </div>
                  <h3 className="font-display font-black text-lg sm:text-xl text-neutral-900 tracking-tight uppercase group-hover:text-crimson transition-colors">
                    {pillar.name}
                  </h3>
                </div>

                <div className="pt-4 font-mono text-[10px] text-neutral-500 flex items-center justify-between">
                  <span>{pillar.category}</span>
                  <ArrowUpRight className={`w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
                    isActive ? 'text-crimson' : 'text-neutral-400'
                  }`} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Pillar Deep-Dive Display */}
        <div className="bg-white border border-neutral-200 p-8 sm:p-12 md:p-16 relative overflow-hidden shadow-xl rounded-xs">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Left Narrative & Features */}
            <div className="lg:col-span-7 space-y-8">
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xs bg-crimson/10 border border-crimson/20">
                    <IconComponent className="w-5 h-5 text-crimson" />
                  </div>
                  <span className="font-mono text-[10px] text-crimson font-bold uppercase tracking-widest">
                    {currentPillar.badge}
                  </span>
                </div>

                <h3 className="font-display font-black text-2xl sm:text-3xl md:text-4xl text-neutral-950 tracking-tight uppercase leading-tight">
                  {currentPillar.headline}
                </h3>

                <p className="font-sans text-sm sm:text-base text-neutral-600 leading-relaxed max-w-2xl">
                  {currentPillar.description}
                </p>
              </div>

              {/* Feature Checklist */}
              <div className="space-y-3 pt-2">
                <div className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest font-bold">
                  [ KEY CAPABILITIES ]
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentPillar.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-2.5 bg-[#F9F9F8] border border-neutral-200 p-3.5 rounded-xs">
                      <CheckCircle2 className="w-4 h-4 text-crimson shrink-0 mt-0.5" />
                      <span className="font-sans text-xs sm:text-sm text-neutral-800">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-4">
                <a
                  href="#contact"
                  className="px-6 py-3 bg-crimson text-white font-mono text-xs font-bold uppercase tracking-wider hover:bg-crimson/90 transition-all flex items-center gap-2 shadow-md shadow-crimson/20"
                >
                  <span>Learn more about {currentPillar.name}</span>
                  <ArrowUpRight className="w-4 h-4" />
                </a>

                <div className="flex items-center gap-1.5 font-mono text-[10px] text-neutral-500 tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>NDPA &amp; HIPAA ALIGNED</span>
                </div>
              </div>

            </div>

            {/* Right Metrics & Traction Bento */}
            <div className="lg:col-span-5 space-y-4">
              
              <div className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest font-bold">
                [ IMPACT METRICS &amp; REACH ]
              </div>

              <div className="space-y-3">
                {currentPillar.metrics.map((metric, mIdx) => (
                  <div
                    key={mIdx}
                    className="p-6 bg-[#F9F9F8] border border-neutral-200 flex items-center justify-between rounded-xs"
                  >
                    <div>
                      <div className="font-display font-black text-3xl sm:text-4xl text-neutral-950 tracking-tight">
                        {metric.value}
                      </div>
                      <div className="font-mono text-[10px] sm:text-[11px] text-neutral-500 tracking-wider uppercase pt-1">
                        {metric.label}
                      </div>
                    </div>

                    <div className="w-8 h-8 rounded-full border border-neutral-300 flex items-center justify-center font-mono text-[10px] text-neutral-500 bg-white">
                      0{mIdx + 1}
                    </div>
                  </div>
                ))}
              </div>

              {/* Connected Advantage Callout */}
              <div className="p-4 bg-neutral-100 border border-neutral-200 font-mono text-[11px] text-neutral-600 leading-relaxed rounded-xs">
                <span className="text-neutral-900 font-bold">ECOSYSTEM ADVANTAGE:</span> Direct interoperability between consumer tracking logs and clinical provider records.
              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
