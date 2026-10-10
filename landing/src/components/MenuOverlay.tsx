import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ArrowRight
} from 'lucide-react';

interface MenuOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  brandName?: string;
  activePage?: 'home' | 'about' | 'newsroom' | 'contact';
}

export const MenuOverlay: React.FC<MenuOverlayProps> = ({
  isOpen,
  onClose,
  brandName = 'RED APPLE',
  activePage,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Primary navigation links moved from the header
  const navLinks = [
    {
      num: '01',
      title: 'Home',
      subtitle: 'Maternal intelligence platform & ecosystem',
      href: '/',
      id: 'home',
    },
    {
      num: '02',
      title: 'Solutions',
      subtitle: 'Consumer App, Connect Telehealth & Clinic OS',
      href: '/#products',
      id: 'solutions',
    },
    {
      num: '03',
      title: 'About Us',
      subtitle: 'The frontline clinical squad & mission',
      href: '/about',
      id: 'about',
    },
    {
      num: '04',
      title: 'Newsroom',
      subtitle: 'Dispatches, clinical research & whitepapers',
      href: '/newsroom',
      id: 'newsroom',
    },
    {
      num: '05',
      title: 'Contact',
      subtitle: 'Talk to clinicians, partner clinics & patients',
      href: '/contact',
      id: 'contact',
    },
  ];


  const content = (
    <div className="fixed inset-0 z-50 flex justify-end">

      {/* Soft Frosted Backdrop Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
        aria-hidden="true"
      />

      {/* Clean Slide-In Drawer */}
      <div className="relative w-full max-w-lg md:max-w-xl bg-white h-full shadow-2xl border-l border-neutral-200 z-10 flex flex-col justify-between overflow-y-auto p-6 sm:p-10 animate-in slide-in-from-right duration-300">

        {/* Top Header */}
        <div className="space-y-8">

          {/* Header Row: Logo + Close */}
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
            <a
              href="/"
              onClick={onClose}
              className="flex items-center gap-3 group cursor-pointer"
            >
              <img
                src="/logo.png"
                alt="Red Apple"
                className="w-9 h-9 object-contain group-hover:scale-105 transition-transform"
              />
              <span className="font-editorial text-2xl tracking-tight text-neutral-950 font-normal">
                {brandName}
              </span>
            </a>

            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center transition-all hover:rotate-90 cursor-pointer"
              aria-label="Close Navigation Menu"
            >
              <X className="w-5 h-5 text-neutral-700" />
            </button>
          </div>

          {/* Primary Navigation Links (Moved from the Header) */}

          <nav className="divide-y divide-neutral-100">
            {navLinks.map((item) => {
              const isActive = activePage === item.id ||
                (item.id === 'home' && (activePage === 'home' || !activePage));

              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={onClose}
                  className="group block py-3.5 sm:py-4 transition-all cursor-pointer"
                >
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-3 sm:gap-4">
                      <span className="font-mono text-xs font-semibold text-neutral-400 group-hover:text-crimson transition-colors">
                        {item.num}
                      </span>

                      <div className="relative">
                        <span className={`font-editorial text-2xl sm:text-3xl md:text-4xl tracking-tight transition-colors ${isActive
                          ? 'text-neutral-950 font-normal'
                          : 'text-neutral-800 group-hover:text-crimson font-normal'
                          }`}>
                          {item.title}
                        </span>

                        {/* Hand-drawn squiggly blue wave SVG indicator when active or hovered */}
                        {isActive && (
                          <svg
                            className="absolute -bottom-1.5 left-0 w-full h-1.5 text-[#C81E3A] overflow-visible"
                            viewBox="0 0 60 6"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="M1 3.5C5 1 9 5.5 13 3.5C17 1.5 21 5.5 25 3.5C29 1.5 33 5.5 37 3.5C41 1.5 45 5.5 49 3.5C53 1.5 57 5 59 3"
                              stroke="currentColor"
                              strokeWidth="2.4"
                              strokeLinecap="round"
                            />
                          </svg>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-neutral-50 group-hover:bg-red-50 text-neutral-400 group-hover:text-crimson flex items-center justify-center transition-all group-hover:translate-x-1">
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>

                  <p className="font-sans text-xs text-neutral-500 pl-7 sm:pl-9 mt-1 font-normal group-hover:text-neutral-700 transition-colors">
                    {item.subtitle}
                  </p>
                </a>
              );
            })}
          </nav>

        </div>
      </div>

    </div>
  );

  return createPortal(content, document.body);
};
