import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[#050505] text-white py-16 md:py-20 px-6 sm:px-12 md:px-16 lg:px-24 font-sans select-none border-t border-neutral-900">
      <div className="max-w-7xl mx-auto space-y-16">
        
        {/* Top Footer Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
          
          {/* Brand Col */}
          <div className="col-span-2 space-y-4">
            <div>
              <span className="font-display font-black text-xl sm:text-2xl tracking-tight uppercase">
                RED APPLE
              </span>
            </div>
            
            <p className="font-sans text-xs text-neutral-400 leading-relaxed max-w-sm">
              The connected reproductive and fertility healthcare infrastructure built for African women, specialist doctors, and clinics.
            </p>

            <div className="font-mono text-[10px] text-neutral-400 space-y-1 pt-2">
              <div>LAGOS: VICTORIA ISLAND, LAGOS, NIGERIA</div>
              <div>ACCRA: AIRPORT RESIDENTIAL, ACCRA, GHANA</div>
            </div>
          </div>

          {/* Products Col */}
          <div className="space-y-3 font-mono text-xs">
            <div className="text-[10px] text-neutral-300 font-bold uppercase tracking-wider">[ PRODUCTS ]</div>
            <ul className="space-y-2 text-neutral-400">
              <li><a href="#products" className="hover:text-white transition-colors">Red Apple App</a></li>
              <li><a href="#products" className="hover:text-white transition-colors">Red Apple Connect</a></li>
              <li><a href="#products" className="hover:text-white transition-colors">Red Apple OS</a></li>
              <li><a href="#products" className="hover:text-white transition-colors">Specialist Network</a></li>
            </ul>
          </div>

          {/* Company Col */}
          <div className="space-y-3 font-mono text-xs">
            <div className="text-[10px] text-neutral-300 font-bold uppercase tracking-wider">[ COMPANY ]</div>
            <ul className="space-y-2 text-neutral-400">
              <li><a href="#about" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#investors" className="hover:text-white transition-colors">Investors</a></li>
              <li><a href="#traction" className="hover:text-white transition-colors">Traction &amp; Milestones</a></li>
              <li><a href="#contact" className="hover:text-white transition-colors">Careers &amp; Grants</a></li>
              <li><a href="#contact" className="hover:text-white transition-colors">Press &amp; Research</a></li>
            </ul>
          </div>

          {/* Legal & Privacy Col */}
          <div className="space-y-3 font-mono text-xs">
            <div className="text-[10px] text-neutral-300 font-bold uppercase tracking-wider">[ LEGAL &amp; NDPA ]</div>
            <ul className="space-y-2 text-neutral-400">
              <li><a href="#privacy" className="hover:text-white transition-colors">Terms of Use</a></li>
              <li><a href="#privacy" className="hover:text-white transition-colors">Privacy Notice</a></li>
              <li><a href="#privacy" className="hover:text-white transition-colors">NDPA Data Policy</a></li>
              <li><a href="#privacy" className="hover:text-white transition-colors">Security Policy</a></li>
              <li><a href="#privacy" className="hover:text-white transition-colors">Cookie Notice</a></li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-neutral-900 flex flex-col sm:flex-row justify-between items-center text-[10px] font-mono text-neutral-400 uppercase tracking-widest gap-4">
          <div>
            © 2026 RED APPLE HEALTH TECHNOLOGIES INC. ALL RIGHTS RESERVED.
          </div>

          <div className="flex items-center gap-4">
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">LINKEDIN</a>
            <span>/</span>
            <a href="https://x.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">X (TWITTER)</a>
            <span>/</span>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">INSTAGRAM</a>
          </div>
        </div>

      </div>
    </footer>
  );
};
