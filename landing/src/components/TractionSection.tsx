import React from 'react';
import { Calendar, CheckCircle, Clock } from 'lucide-react';

export const TractionSection: React.FC = () => {
  const milestones = [
    {
      quarter: 'Q1 2025',
      title: 'FOUNDATION & CLINICAL PROTOCOLS',
      status: 'COMPLETED',
      description:
        'Assembled board of certified Nigerian OB-GYNs and fertility endocrinologists. Formulated localized clinical guidelines and data privacy framework aligned with NDPA & HIPAA.',
      metrics: ['12 Clinical Advisors', 'NDPA Full Compliance', 'AES-256 Architecture'],
    },
    {
      quarter: 'Q3 2025',
      title: 'RED APPLE APP LAUNCH (CONSUMER BETA)',
      status: 'COMPLETED',
      description:
        'Released consumer cycle tracking & ovulation prediction engine in Nigeria and Ghana. Achieved rapid organic adoption across urban female demographics.',
      metrics: ['50K+ Downloads', '78% 30-Day Retention', '4.8 App Store Rating'],
    },
    {
      quarter: 'Q1 2026',
      title: 'RED APPLE CONNECT SPECIALIST TELEMEDICINE',
      status: 'ACTIVE',
      description:
        'Rolled out on-demand encrypted video consultations connecting patients with vetted reproductive specialists. Average booking time under 2 hours.',
      metrics: ['180+ Specialists Onboarded', '15K+ Consultations', '94% Patient Satisfaction'],
    },
    {
      quarter: 'Q3 2026',
      title: 'RED APPLE OS CLINIC SAAS PILOT',
      status: 'SCALING',
      description:
        'Piloted clinic EHR and appointment workflow digitization with 45 partner maternity and reproductive health clinics across Lagos, Abuja, and Accra.',
      metrics: ['45 Partner Clinics', '120K+ Records Digitized', '64% Admin Time Saved'],
    },
    {
      quarter: '2027+',
      title: 'PAN-AFRICAN SCALE & INTEGRATED PHARMACY',
      status: 'ROADMAP',
      description:
        'Expanding provider network into East and Francophone Africa, integrating smart e-prescriptions with pan-African pharmaceutical distribution networks.',
      metrics: ['5 New Markets', 'Integrated Lab Telemetry', 'Maternal Insurance Layer'],
    },
  ];

  return (
    <section id="traction" className="relative w-full bg-[#070707] text-white py-24 md:py-32 px-6 sm:px-12 md:px-16 lg:px-24 font-sans select-none border-t border-neutral-900">
      
      <div className="max-w-7xl mx-auto space-y-16 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-neutral-800/80">
          <div className="space-y-3 max-w-2xl">
            <div className="font-mono text-[10px] sm:text-[11px] text-crimson font-bold tracking-[0.25em] uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-crimson" />
              <span>EXECUTION &amp; VELOCITY</span>
            </div>
            <h2 className="font-display font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white tracking-[-0.03em] uppercase leading-[0.95]">
              TRACTION &amp; MILESTONES
            </h2>
          </div>

          <div className="max-w-md font-sans text-xs sm:text-sm text-neutral-400 leading-relaxed">
            Our disciplined roadmap from clinical protocol validation to pan-African ecosystem scale.
          </div>
        </div>

        {/* Milestone Timeline List */}
        <div className="space-y-6">
          {milestones.map((item, idx) => {
            const isCompleted = item.status === 'COMPLETED';
            const isActive = item.status === 'ACTIVE' || item.status === 'SCALING';

            return (
              <div
                key={idx}
                className={`p-6 sm:p-8 border transition-all duration-200 ${
                  isActive
                    ? 'bg-neutral-900/90 border-crimson/80 shadow-[0_0_30px_rgba(230,0,38,0.1)]'
                    : isCompleted
                    ? 'bg-neutral-950/80 border-neutral-800 hover:border-neutral-700'
                    : 'bg-neutral-950/40 border-neutral-900 opacity-70'
                }`}
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Quarter & Status Badge */}
                  <div className="lg:col-span-3 space-y-2">
                    <div className="flex items-center gap-2 text-neutral-400 font-mono text-xs">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="font-bold text-white text-sm">{item.quarter}</span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 font-mono text-[9px] px-2 py-0.5 uppercase tracking-wider rounded-xs font-bold"
                      style={{
                        backgroundColor: isActive ? 'rgba(230,0,38,0.15)' : isCompleted ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                        color: isActive ? '#E60026' : isCompleted ? '#10B981' : '#9CA3AF'
                      }}
                    >
                      {isCompleted && <CheckCircle className="w-3 h-3" />}
                      {isActive && <span className="w-2 h-2 rounded-full bg-crimson animate-pulse" />}
                      {!isCompleted && !isActive && <Clock className="w-3 h-3" />}
                      <span>{item.status}</span>
                    </div>
                  </div>

                  {/* Middle Description */}
                  <div className="lg:col-span-6 space-y-2">
                    <h3 className="font-display font-black text-lg sm:text-xl text-white tracking-tight uppercase">
                      {item.title}
                    </h3>
                    <p className="font-sans text-xs sm:text-sm text-neutral-300 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Right Metric Pills */}
                  <div className="lg:col-span-3 space-y-2">
                    <div className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest font-bold">
                      KEY DELIVERABLES
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {item.metrics.map((m, mIdx) => (
                        <div key={mIdx} className="font-mono text-[10px] text-neutral-200 bg-neutral-900/80 px-2.5 py-1 border border-neutral-800/80 flex items-center gap-1.5">
                          <span className="text-crimson">•</span>
                          <span>{m}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
