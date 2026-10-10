import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cookie, X, Check, Lock, Sliders } from 'lucide-react';

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  functional: boolean;
  timestamp: string;
}

const STORAGE_KEY = 'red_apple_cookie_consent_v1';

export const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [functionalEnabled, setFunctionalEnabled] = useState(true);

  useEffect(() => {
    // Check if consent has already been given
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        // Small delay so page renders smoothly first
        const timer = setTimeout(() => setIsVisible(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // If local storage is disabled, show banner
      setIsVisible(true);
    }
  }, []);

  // Listen for global request to open cookie settings (e.g. from footer link)
  useEffect(() => {
    const handleOpenSettings = () => {
      // Load current preferences if stored
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as CookiePreferences;
          setAnalyticsEnabled(parsed.analytics);
          setFunctionalEnabled(parsed.functional);
        }
      } catch {
        // Ignore parse errors
      }
      setIsPreferencesOpen(true);
      setIsVisible(true);
    };

    window.addEventListener('open-cookie-settings', handleOpenSettings);
    return () => window.removeEventListener('open-cookie-settings', handleOpenSettings);
  }, []);

  const saveConsent = (prefs: CookiePreferences) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // LocalStorage access issues
    }
    setIsVisible(false);
    setIsPreferencesOpen(false);

    // Dispatch event in case analytics/scripts need to initialize
    window.dispatchEvent(new CustomEvent('cookie_consent_updated', { detail: prefs }));
  };

  const handleAcceptAll = () => {
    saveConsent({
      essential: true,
      analytics: true,
      functional: true,
      timestamp: new Date().toISOString(),
    });
  };

  const handleRejectNonEssential = () => {
    saveConsent({
      essential: true,
      analytics: false,
      functional: false,
      timestamp: new Date().toISOString(),
    });
  };

  const handleSaveCustom = () => {
    saveConsent({
      essential: true,
      analytics: analyticsEnabled,
      functional: functionalEnabled,
      timestamp: new Date().toISOString(),
    });
  };

  if (!isVisible) return null;

  return (
    <>
      {/* 1. Main Floating Consent Card */}
      {!isPreferencesOpen && (
        <aside
          role="region"
          aria-label="Cookie consent banner"
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-neutral-200 font-sans animate-in slide-in-from-bottom-6 duration-300"
        >
          <div className="space-y-4">
            
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-red-50 text-crimson flex items-center justify-center shrink-0 border border-red-100">
                  <Cookie className="w-5 h-5 text-crimson" />
                </div>
                <div>
                  <h3 className="font-editorial text-lg text-neutral-900 font-normal leading-tight">
                    Your Health &amp; Privacy First
                  </h3>
                  <div className="text-[11px] text-neutral-500 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>NDPA 2023 Aligned</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleRejectNonEssential}
                className="text-neutral-400 hover:text-neutral-600 p-1 rounded-full transition-colors cursor-pointer"
                aria-label="Dismiss and use essential only"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <p className="font-sans text-xs text-neutral-600 leading-relaxed font-normal">
              We use strictly necessary cookies to keep our clinical platform safe and optional cookies to understand how mothers and healthcare providers navigate our guides. Your medical telemetry is never shared.
            </p>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAcceptAll}
                  className="flex-1 py-2.5 px-4 rounded-full bg-crimson hover:bg-crimson-dark text-white text-xs font-semibold transition-all shadow-md shadow-crimson/20 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Accept All Cookies</span>
                </button>

                <button
                  onClick={handleRejectNonEssential}
                  className="flex-1 py-2.5 px-4 rounded-full bg-neutral-50 hover:bg-neutral-100 text-neutral-700 text-xs font-medium border border-neutral-200 transition-colors cursor-pointer"
                >
                  <span>Essential Only</span>
                </button>
              </div>

              <button
                onClick={() => setIsPreferencesOpen(true)}
                className="w-full text-center py-1 text-[11px] text-neutral-500 hover:text-crimson font-medium transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                <Sliders className="w-3 h-3" />
                <span>Customize Preferences</span>
              </button>
            </div>

          </div>
        </aside>
      )}

      {/* 2. Detailed Cookie Preferences Modal */}
      {isPreferencesOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          
          {/* Backdrop */}
          <div
            onClick={() => setIsPreferencesOpen(false)}
            className="fixed inset-0 bg-neutral-900/50 backdrop-blur-xs transition-opacity animate-in fade-in"
            aria-hidden="true"
          />

          {/* Modal Card */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-modal-title"
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-neutral-200 p-6 sm:p-8 z-10 space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-50 text-crimson flex items-center justify-center border border-red-100">
                  <Cookie className="w-5 h-5 text-crimson" />
                </div>
                <div>
                  <h3 id="cookie-modal-title" className="font-editorial text-xl sm:text-2xl text-neutral-900 font-normal">
                    Cookie &amp; Privacy Preferences
                  </h3>
                  <p className="text-xs text-neutral-500 font-normal">
                    Manage how Red Apple uses cookies to protect and serve you.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsPreferencesOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Categories List */}
            <div className="space-y-3">
              
              {/* Category 1: Strictly Necessary */}
              <div className="p-4 rounded-2xl bg-white border border-neutral-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-600" />
                    <span className="font-editorial text-base text-neutral-900 font-normal">
                      Strictly Essential Cookies
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Always Active
                  </span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed font-normal">
                  Required for core security, session authentication, and NDPA compliance. Without these cookies, the medical platform cannot function securely.
                </p>
              </div>

              {/* Category 2: Analytics & Insights */}
              <div className="p-4 rounded-2xl bg-white border border-neutral-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-editorial text-base text-neutral-900 font-normal">
                      Usage &amp; Health Insights
                    </span>
                  </div>
                  
                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={analyticsEnabled}
                      onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-crimson"></div>
                  </label>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed font-normal">
                  Helps us understand which clinical articles and maternal tracking tools are most helpful. All metrics are aggregated and 100% de-identified.
                </p>
              </div>

              {/* Category 3: Preferences & Personalization */}
              <div className="p-4 rounded-2xl bg-white border border-neutral-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-editorial text-base text-neutral-900 font-normal">
                      Preferences &amp; Regional Filters
                    </span>
                  </div>
                  
                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={functionalEnabled}
                      onChange={(e) => setFunctionalEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-crimson"></div>
                  </label>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed font-normal">
                  Remembers your preferred regional healthcare hub (e.g. Lagos or Accra), reading preferences, and notification status across sessions.
                </p>
              </div>

            </div>

            {/* Privacy Assurance */}
            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center gap-2.5 text-xs text-neutral-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Zero-knowledge client encryption: Your medical history is never tracked by advertising pixels.</span>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={handleSaveCustom}
                className="w-full sm:flex-1 py-3 px-5 rounded-full bg-crimson hover:bg-crimson-dark text-white text-xs font-semibold transition-all shadow-md shadow-crimson/20 cursor-pointer"
              >
                Save My Preferences
              </button>

              <button
                onClick={handleAcceptAll}
                className="w-full sm:w-auto py-3 px-5 rounded-full bg-white border border-neutral-200 text-neutral-800 text-xs font-medium hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                Accept All
              </button>
            </div>

          </div>

        </div>
      )}
    </>
  );
};
