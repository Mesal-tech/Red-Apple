import React, { useState, useEffect } from 'react';
import { MenuOverlay } from './MenuOverlay';

interface NavbarProps {
  brandName?: string;
  transparentOnTop?: boolean;
  activePage?: 'home' | 'about' | 'newsroom' | 'contact';
}

export const Navbar: React.FC<NavbarProps> = ({
  brandName = 'RED APPLE',
  activePage,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDarkTheme = () => {
      const darkSections = document.querySelectorAll<HTMLElement>('[data-nav-theme="dark"]');
      let foundDark = false;
      const navCheckLine = 50; // Check ~50px below viewport top

      darkSections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= navCheckLine && rect.bottom >= navCheckLine) {
          foundDark = true;
        }
      });

      setIsDark(foundDark);
    };

    window.addEventListener('scroll', checkDarkTheme, { passive: true });
    window.addEventListener('resize', checkDarkTheme, { passive: true });
    checkDarkTheme();

    return () => {
      window.removeEventListener('scroll', checkDarkTheme);
      window.removeEventListener('resize', checkDarkTheme);
    };
  }, []);

  return (
    <>
      {/* Seamless Floating Header (Transparent Background to Never Obstruct the Page) */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-transparent py-3.5 transition-colors duration-300 pointer-events-none">
        <nav className="max-w-7xl mx-auto px-6 sm:px-10 flex items-center justify-between">
          
          {/* Brand Logo & Name (Switches between Dark and Light mode seamlessly) */}
          <a
            href="/"
            className="flex items-center gap-3 group cursor-pointer select-none pointer-events-auto"
          >
            <img
              src={isDark ? '/logo-white.png' : '/logo.png'}
              alt="Red Apple"
              className="w-9 h-9 sm:w-10 sm:h-10 object-contain group-hover:scale-105 transition-all drop-shadow-2xs"
            />
            <span
              className={`font-sans font-extrabold text-lg sm:text-xl tracking-tight transition-colors duration-300 ${
                isDark ? 'text-white' : 'text-neutral-950'
              }`}
            >
              {brandName}
            </span>
          </a>

          {/* Right Action Group: Dot Contact Button & Grid Menu Toggle */}
          <div className="flex items-center gap-2.5 pointer-events-auto">
            <a
              href="/contact"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-neutral-200/80 bg-white/95 backdrop-blur-md hover:bg-white text-[11px] font-bold uppercase tracking-wider text-neutral-900 transition-all shadow-md cursor-pointer group"
            >
              <span className="w-2 h-2 rounded-full bg-crimson" />
              <span>Contact</span>
            </a>

            <button
              onClick={() => setIsMenuOpen(true)}
              type="button"
              className="group grid size-[38px] sm:size-[40px] place-items-center rounded-xl border border-neutral-200/80 bg-white/95 backdrop-blur-md text-neutral-900 transition-all hover:bg-white shadow-md cursor-pointer"
              aria-label="Open Navigation Menu"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="size-4.5 transition-transform duration-200 group-hover:scale-110"
              >
                <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" fill="currentColor" />
                <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" fill="currentColor" />
                <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" fill="currentColor" />
                <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" fill="currentColor" />
              </svg>
            </button>
          </div>

        </nav>
      </header>

      {/* Directory Menu Overlay */}
      <MenuOverlay
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        brandName={brandName}
        activePage={activePage}
      />
    </>
  );
};
