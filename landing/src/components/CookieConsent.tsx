import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

export interface CookiePreferences {
  necessary: boolean;
  preferences: boolean;
  statistics: boolean;
  marketing: boolean;
  timestamp: string;
}

const STORAGE_KEY = 'red_apple_cookie_consent_v2';

export const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Category toggles matching the reference Cookiebot design
  const [preferencesEnabled, setPreferencesEnabled] = useState(true);
  const [statisticsEnabled, setStatisticsEnabled] = useState(true);
  const [marketingEnabled, setMarketingEnabled] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        // Small delay so initial page loads smoothly
        const timer = setTimeout(() => setIsVisible(true), 600);
        return () => clearTimeout(timer);
      }
    } catch {
      setIsVisible(true);
    }
  }, []);

  // Listen for global event to reopen cookie settings (e.g. from footer)
  useEffect(() => {
    const handleOpenSettings = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as CookiePreferences;
          setPreferencesEnabled(parsed.preferences ?? true);
          setStatisticsEnabled(parsed.statistics ?? true);
          setMarketingEnabled(parsed.marketing ?? true);
        }
      } catch {
        // Ignore parse errors
      }
      setIsVisible(true);
    };

    window.addEventListener('open-cookie-settings', handleOpenSettings);
    return () => window.removeEventListener('open-cookie-settings', handleOpenSettings);
  }, []);

  const saveConsent = (prefs: CookiePreferences) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore storage errors
    }
    setIsVisible(false);
    window.dispatchEvent(new CustomEvent('cookie_consent_updated', { detail: prefs }));
  };

  const handleAllowAll = () => {
    saveConsent({
      necessary: true,
      preferences: true,
      statistics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
    });
  };

  const handleAllowSelection = () => {
    saveConsent({
      necessary: true,
      preferences: preferencesEnabled,
      statistics: statisticsEnabled,
      marketing: marketingEnabled,
      timestamp: new Date().toISOString(),
    });
  };

  const handleRejectAll = () => {
    saveConsent({
      necessary: true,
      preferences: false,
      statistics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    });
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Soft translucent backdrop to focus user attention */}
      <div
        className="fixed inset-0 z-[990] bg-black/40 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-300"
        aria-hidden="true"
      />

      {/* Cookiebot / Delta Cafés Exact Styled Bottom Modal */}
      <aside
        role="dialog"
        aria-label="Cookie consent banner"
        aria-modal="true"
        className="fixed bottom-0 left-0 right-0 z-[999] bg-white text-neutral-900 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] border-t border-neutral-200 animate-in slide-in-from-bottom duration-300 font-sans"
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 py-6 sm:py-8">

          {/* MAIN 3-COLUMN ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

            {/* 1. LEFT COLUMN: Brand Logo (Vertically Centered) */}
            <div className="hidden sm:flex lg:col-span-2 items-center justify-start lg:justify-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl p-2 flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="Red Apple"
                  className="w-full h-full object-contain filter drop-shadow-xs"
                />
              </div>
            </div>

            {/* 2. CENTER COLUMN: Title & Description */}
            <div className="lg:col-span-7 space-y-2.5 text-left">
              <div className="flex items-center gap-3 sm:hidden mb-2">
                <img
                  src="/logo.png"
                  alt="Red Apple"
                  className="w-9 h-9 object-contain"
                />
                <h2 className="font-sans font-bold text-base text-neutral-950">
                  Cookies on our site
                </h2>
              </div>

              <h2 className="hidden sm:block font-sans font-bold text-lg sm:text-xl text-neutral-950 tracking-tight">
                Cookies on our site
              </h2>

              <p className="text-xs sm:text-[13px] text-neutral-600 leading-relaxed font-normal">
                By default, we only use cookies necessary for navigating our site. If you consent, cookies may also be used to analyze traffic, personalize your navigation experience, or optimize our African maternal health intelligence platform. Through the buttons on the right, you can accept or reject all cookies, or customize your preferences below.
              </p>
            </div>

            {/* 3. RIGHT COLUMN: 3 Stacked Buttons Matching Delta Cafés */}
            <div className="lg:col-span-3 flex flex-col gap-2.5 w-full">
              {/* Primary: Solid Crimson Red */}
              <button
                type="button"
                onClick={handleAllowAll}
                className="w-full py-3 px-4 bg-[#C81E3A] hover:bg-[#A5142E] text-white font-bold text-xs sm:text-sm tracking-wide transition-colors cursor-pointer rounded-xs text-center shadow-xs"
              >
                Allow all cookies
              </button>

              {/* Secondary 1: White with Crimson Border */}
              <button
                type="button"
                onClick={handleAllowSelection}
                className="w-full py-2.5 px-4 bg-white hover:bg-neutral-50 text-neutral-900 font-bold text-xs sm:text-sm border border-[#C81E3A] tracking-wide transition-colors cursor-pointer rounded-xs text-center"
              >
                Allow selection
              </button>

              {/* Secondary 2: White with Crimson Border */}
              <button
                type="button"
                onClick={handleRejectAll}
                className="w-full py-2.5 px-4 bg-white hover:bg-neutral-50 text-neutral-900 font-bold text-xs sm:text-sm border border-[#C81E3A] tracking-wide transition-colors cursor-pointer rounded-xs text-center"
              >
                Reject all
              </button>
            </div>

          </div>

          {/* BOTTOM BAR: Compliance Badge + 4 Toggles + Show Details link */}
          <div className="mt-6 pt-4 border-t border-neutral-200/90 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">

            {/* Category Toggles & Details Link */}
            <div className="flex items-center flex-wrap gap-x-6 gap-y-3">

              {/* 1. Necessary (Locked Red Switch) */}
              <div className="flex items-center gap-2.5 select-none">
                <span className="text-xs font-semibold text-neutral-900">Necessary</span>
                <div
                  className="w-11 h-6 rounded-full bg-[#C81E3A] p-0.5 flex items-center justify-end cursor-not-allowed opacity-95 shadow-inner"
                  title="Necessary cookies are mandatory for core website security & operation"
                >
                  <div className="w-5 h-5 rounded-full bg-white shadow-xs" />
                </div>
              </div>

              {/* 2. Preferences Toggle */}
              <button
                type="button"
                onClick={() => setPreferencesEnabled(!preferencesEnabled)}
                className="flex items-center gap-2.5 cursor-pointer select-none group"
                aria-pressed={preferencesEnabled}
              >
                <span className="text-xs font-medium text-neutral-800 group-hover:text-black">
                  Preferences
                </span>
                <div
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors flex items-center ${
                    preferencesEnabled ? 'bg-neutral-900 justify-end' : 'bg-neutral-200 justify-start'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-white shadow-xs transition-transform" />
                </div>
              </button>

              {/* 3. Statistics Toggle */}
              <button
                type="button"
                onClick={() => setStatisticsEnabled(!statisticsEnabled)}
                className="flex items-center gap-2.5 cursor-pointer select-none group"
                aria-pressed={statisticsEnabled}
              >
                <span className="text-xs font-medium text-neutral-800 group-hover:text-black">
                  Statistics
                </span>
                <div
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors flex items-center ${
                    statisticsEnabled ? 'bg-neutral-900 justify-end' : 'bg-neutral-200 justify-start'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-white shadow-xs transition-transform" />
                </div>
              </button>

              {/* 4. Marketing Toggle */}
              <button
                type="button"
                onClick={() => setMarketingEnabled(!marketingEnabled)}
                className="flex items-center gap-2.5 cursor-pointer select-none group"
                aria-pressed={marketingEnabled}
              >
                <span className="text-xs font-medium text-neutral-800 group-hover:text-black">
                  Marketing
                </span>
                <div
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors flex items-center ${
                    marketingEnabled ? 'bg-neutral-900 justify-end' : 'bg-neutral-200 justify-start'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-white shadow-xs transition-transform" />
                </div>
              </button>

              {/* Show Details Link in Crimson Red with Chevron */}
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#C81E3A] hover:text-[#A5142E] transition-colors cursor-pointer ml-auto md:ml-2"
              >
                <span>{showDetails ? 'Hide details' : 'Show details'}</span>
                {showDetails ? (
                  <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
              </button>

            </div>

          </div>

          {/* COLLAPSIBLE DETAILS ACCORDION */}
          {showDetails && (
            <div className="mt-5 pt-4 border-t border-neutral-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-left animate-in slide-in-from-top-2 duration-200">
              <div className="p-3.5 rounded-xs bg-neutral-50 border border-neutral-200/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-900">Necessary</span>
                  <span className="text-[10px] font-mono text-[#C81E3A] font-semibold">ALWAYS ACTIVE</span>
                </div>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  Required for page navigation, session tokens, security safeguards, and NDPA compliance checks.
                </p>
              </div>

              <div className="p-3.5 rounded-xs bg-neutral-50 border border-neutral-200/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-900">Preferences</span>
                  <span className="text-[10px] font-mono text-neutral-500">OPTIONAL</span>
                </div>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  Stores language settings, font sizing, and customized viewing states across your visits.
                </p>
              </div>

              <div className="p-3.5 rounded-xs bg-neutral-50 border border-neutral-200/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-900">Statistics</span>
                  <span className="text-[10px] font-mono text-neutral-500">OPTIONAL</span>
                </div>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  Aggregates anonymous interaction metrics to optimize site performance and clinical information layout.
                </p>
              </div>

              <div className="p-3.5 rounded-xs bg-neutral-50 border border-neutral-200/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-900">Marketing</span>
                  <span className="text-[10px] font-mono text-neutral-500">OPTIONAL</span>
                </div>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  Measures outreach campaigns so our maternal health intelligence reaches more communities across Africa.
                </p>
              </div>
            </div>
          )}

        </div>
      </aside>
    </>
  );
};
