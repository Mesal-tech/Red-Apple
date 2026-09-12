import React, { useState } from 'react';
import { ShieldCheck, HeartPulse, Stethoscope, Smartphone, BookOpen } from 'lucide-react';
import { MenuOverlay } from './MenuOverlay';

interface NavbarProps {
  brandName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  brandName = 'RED APPLE',
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);

  const platformFeatures = [
    {
      name: 'CYCLE & OVULATION PREDICTOR',
      description: 'Accurate window forecasting & symptom logs',
      icon: HeartPulse,
      badge: 'CORE'
    },
    {
      name: 'TELEMEDICINE CONSULTATIONS',
      description: 'Book certified OB-GYNs & fertility experts',
      icon: Stethoscope,
      badge: 'LIVE VIDEO'
    },
    {
      name: 'PREGNANCY CARE MODE',
      description: 'Week-by-week fetal growth & antenatal alerts',
      icon: Smartphone,
      badge: 'MODE'
    },
    {
      name: 'REPRODUCTIVE HEALTH LIBRARY',
      description: 'Doctor-reviewed African medical guides',
      icon: BookOpen,
      badge: 'INSIGHTS'
    },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 pointer-events-none">
        <nav className="w-full px-6 py-4 md:px-10 md:py-6 flex items-center justify-between pointer-events-auto">
          {/* Left Navigation Group */}
          <div className="flex items-center space-x-6 md:space-x-8 text-[11px] font-semibold tracking-wider font-mono select-none">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="hover:text-crimson transition-colors duration-150 flex items-center gap-1 cursor-pointer group"
              aria-label="Open Navigation Menu"
            >
              <span>MENU</span>
              <span className="text-crimson group-hover:rotate-90 transition-transform duration-200">+</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setIsFeaturesOpen(!isFeaturesOpen)}
                className="hidden sm:flex items-center gap-1 hover:text-crimson transition-colors duration-150 cursor-pointer group"
              >
                <span>FEATURES</span>
                <span className={`text-crimson transition-transform duration-200 ${isFeaturesOpen ? 'rotate-45' : ''}`}>+</span>
              </button>

              {/* Features Dropdown Menu */}
              {isFeaturesOpen && (
                <div 
                  className="absolute left-0 mt-3 w-80 bg-white/95 backdrop-blur-md border border-neutral-200 shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  onMouseLeave={() => setIsFeaturesOpen(false)}
                >
                  <div className="text-[10px] text-neutral-400 font-mono mb-2 uppercase tracking-widest pb-1 border-b border-neutral-100 flex justify-between">
                    <span>Clinical Capabilities</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="space-y-2 pt-1">
                    {platformFeatures.map((feat, idx) => {
                      const IconComponent = feat.icon;
                      return (
                        <a
                          key={idx}
                          href={`#feature-${idx}`}
                          onClick={() => setIsFeaturesOpen(false)}
                          className="group block p-2 hover:bg-neutral-50 rounded-xs transition-all"
                        >
                          <div className="flex justify-between items-center mb-0.5">
                            <div className="flex items-center gap-2">
                              <IconComponent className="w-3.5 h-3.5 text-crimson" />
                              <span className="font-semibold text-xs text-neutral-900 group-hover:text-crimson">{feat.name}</span>
                            </div>
                            <span className="text-[9px] text-neutral-500 font-mono bg-neutral-100 px-1 py-0.2">{feat.badge}</span>
                          </div>
                          <p className="text-[11px] text-neutral-500 font-sans pl-5.5">{feat.description}</p>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center Brand Title */}
          <div className="absolute left-1/2 -translate-x-1/2 select-none text-center">
            <a
              href="/"
              className="text-lg md:text-2xl font-black font-display tracking-tight hover:opacity-85 transition-opacity uppercase"
            >
              <span>{brandName}</span>
            </a>
          </div>

          {/* Empty Right Area for Balance */}
          <div className="w-16 hidden sm:block" />
        </nav>
      </header>

      {/* Fullscreen Brutalist Luxury Editorial Menu Overlay */}
      <MenuOverlay
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        brandName={brandName}
      />
    </>
  );
};
