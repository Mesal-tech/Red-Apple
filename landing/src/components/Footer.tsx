import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="relative z-30 w-full bg-[#0A0A0C] text-white font-sans border-t border-dashed border-neutral-800">
      {/* Max-width Container bounded by Terra-style vertical dashed borders */}
      <div className="max-w-7xl mx-auto border-x border-dashed border-neutral-800">

        {/* 1. Top Section: Links Grid */}
        <div className="py-14 sm:py-16 md:py-20 px-6 sm:px-10 lg:px-14 border-b border-dashed border-neutral-800">
          <div className="flex flex-row justify-between items-start gap-8">
            
            {/* Left Column: Platform & Governance */}
            <div className="space-y-4 sm:space-y-5">
              <div>
                <a
                  href="/"
                  className="block font-sans font-bold text-xs sm:text-sm tracking-[0.08em] uppercase text-neutral-300 hover:text-white transition-colors"
                >
                  HOME
                </a>
              </div>
              <div>
                <a
                  href="/#products"
                  className="block font-sans font-bold text-xs sm:text-sm tracking-[0.08em] uppercase text-neutral-300 hover:text-white transition-colors"
                >
                  SOLUTIONS
                </a>
              </div>
              <div>
                <a
                  href="/about"
                  className="block font-sans font-bold text-xs sm:text-sm tracking-[0.08em] uppercase text-neutral-300 hover:text-white transition-colors"
                >
                  ABOUT US
                </a>
              </div>
              <div>
                <a
                  href="/terms"
                  className="block font-sans font-bold text-xs sm:text-sm tracking-[0.08em] uppercase text-neutral-300 hover:text-white transition-colors"
                >
                  TERMS &amp; CONDITIONS
                </a>
              </div>
            </div>

            {/* Right Column: Communications & Privacy (Right-aligned) */}
            <div className="space-y-4 sm:space-y-5 text-right">
              <div>
                <a
                  href="/newsroom"
                  className="block font-sans font-bold text-xs sm:text-sm tracking-[0.08em] uppercase text-neutral-300 hover:text-white transition-colors"
                >
                  NEWSROOM
                </a>
              </div>
              <div>
                <a
                  href="/privacy"
                  className="block font-sans font-bold text-xs sm:text-sm tracking-[0.08em] uppercase text-neutral-300 hover:text-white transition-colors"
                >
                  PRIVACY POLICY
                </a>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new Event('open-cookie-settings'))}
                  className="block font-sans font-bold text-xs sm:text-sm tracking-[0.08em] uppercase text-neutral-300 hover:text-white transition-colors cursor-pointer ml-auto"
                >
                  COOKIE SETTINGS
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* 2. Bottom Section: Brand + Socials & Copyright (Divided vertically by dashed border) */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-dashed divide-neutral-800">
          
          {/* Left Column: Brand Identity */}
          <div className="py-10 sm:py-12 md:py-14 px-6 sm:px-10 lg:px-14 flex items-center">
            <a href="/" className="inline-flex items-center gap-3.5 group">
              <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center p-1.5 transition-transform group-hover:scale-105">
                <img
                  src="/logo.png"
                  alt="Red Apple"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-sans font-extrabold text-2xl sm:text-3xl tracking-tight text-white">
                Red Apple
              </span>
            </a>
          </div>

          {/* Right Column: Social Icons & Copyright */}
          <div className="py-10 sm:py-12 md:py-14 px-6 sm:px-10 lg:px-14 flex flex-col justify-center items-start md:items-end gap-4 sm:gap-5 md:text-right">
            
            {/* Social Media Badges */}
            <div className="flex items-center gap-2.5">
              {/* X / Twitter Badge */}
              <a
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Follow Red Apple on X (Twitter)"
                className="w-9 h-9 rounded-md bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-white flex items-center justify-center transition-all hover:bg-neutral-800 hover:scale-105"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>

              {/* LinkedIn Badge */}
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Connect with Red Apple on LinkedIn"
                className="w-9 h-9 rounded-md bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-white flex items-center justify-center transition-all hover:bg-neutral-800 hover:scale-105"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.25a1.64 1.64 0 1 0 1.64 1.63 1.64 1.64 0 0 0-1.64-1.63z" />
                </svg>
              </a>
            </div>

            {/* Copyright */}
            <div className="font-sans text-xs sm:text-sm text-neutral-400 font-medium tracking-tight">
              All Rights Reserved © 2026 Red Apple Health Inc.
            </div>

          </div>

        </div>

      </div>
    </footer>
  );
};
