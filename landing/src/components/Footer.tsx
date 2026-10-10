import React from 'react';
import { Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[#0E0E10] text-white py-16 sm:py-20 px-6 sm:px-10 lg:px-16 font-sans border-t border-neutral-900">
      <div className="max-w-6xl mx-auto space-y-14">
        
        {/* Top Footer Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
          
          {/* Brand Column */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Red Apple"
                className="w-8 h-8 object-contain drop-shadow-sm"
              />
              <span className="font-editorial text-2xl tracking-tight text-white font-normal">
                RED APPLE
              </span>
            </div>
            
            <p className="font-sans text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-sm font-normal">
              A connected maternal &amp; reproductive healthcare ecosystem built with clinical devotion for African women, specialist doctors, and clinics.
            </p>
          </div>

          {/* Solutions Col */}
          <div className="space-y-3 text-xs">
            <div className="text-xs font-mono text-neutral-400 uppercase tracking-widest font-semibold">Solutions</div>
            <ul className="space-y-2 text-neutral-400">
              <li><a href="#products" className="hover:text-white transition-colors">Red Apple App</a></li>
              <li><a href="#products" className="hover:text-white transition-colors">Red Apple Connect</a></li>
              <li><a href="#products" className="hover:text-white transition-colors">Red Apple OS</a></li>
              <li><a href="#products" className="hover:text-white transition-colors">MDCN Telehealth</a></li>
            </ul>
          </div>

          {/* Company Col */}
          <div className="space-y-3 text-xs">
            <div className="text-xs font-mono text-neutral-400 uppercase tracking-widest font-semibold">Company</div>
            <ul className="space-y-2 text-neutral-400">
              <li><a href="/about" className="hover:text-white transition-colors">About &amp; Leadership</a></li>
              <li><a href="/#team" className="hover:text-white transition-colors">The Clinical Squad</a></li>
              <li><a href="/newsroom" className="hover:text-white transition-colors">Newsroom &amp; Press</a></li>
              <li><a href="/contact" className="hover:text-white transition-colors">Talk to Us</a></li>
            </ul>
          </div>

          {/* Privacy & Governance Col */}
          <div className="space-y-3 text-xs">
            <div className="text-xs font-mono text-neutral-400 uppercase tracking-widest font-semibold">Governance</div>
            <ul className="space-y-2 text-neutral-400">
              <li><a href="/about" className="hover:text-white transition-colors">NDPA Data Policy</a></li>
              <li><a href="/about" className="hover:text-white transition-colors">HIPAA Compliance</a></li>
              <li><a href="/about" className="hover:text-white transition-colors">Zero-Knowledge Storage</a></li>
              <li>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new Event('open-cookie-settings'))}
                  className="hover:text-white transition-colors cursor-pointer text-left flex items-center gap-1.5"
                >
                  <span>Cookie Settings</span>
                  <span className="text-[9px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded-xs">Edit</span>
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-neutral-900 flex flex-col sm:flex-row justify-between items-center text-xs text-neutral-500 gap-4">
          <div className="flex items-center gap-2">
            <span>© 2026 Red Apple Health Technologies Inc.</span>
            <span>·</span>
            <span className="text-neutral-400 flex items-center gap-1">
              Built for African Motherhood <Heart className="w-3 h-3 text-[#E11D48] fill-[#E11D48]" />
            </span>
          </div>

          <div className="flex items-center gap-6">
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">LinkedIn</a>
            <a href="https://x.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Twitter / X</a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Instagram</a>
          </div>
        </div>

      </div>
    </footer>
  );
};
