import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';

interface MenuOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  brandName?: string;
}

interface MenuItem {
  id: string;
  href: string;
  tag: string;
  label: string;
  number: string;
  description: string;
  gallery: {
    img: string;
    caption: string;
    tag: string;
  }[];
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: 'app',
    href: '#products',
    tag: '01-APP',
    label: 'RED APPLE APP',
    number: '01',
    description: 'Consumer cycle tracking, contraception guidance, and fertility education.',
    gallery: [
      { img: '/red-apple-family.jpg', caption: 'CYCLE FORECAST', tag: '01' },
      { img: '/red-apple-family.jpg', caption: 'BIOMARKER LOGS', tag: '02' },
      { img: '/red-apple-family.jpg', caption: 'OVULATION WINDOW', tag: '03' },
      { img: '/red-apple-family.jpg', caption: 'HORMONAL HEALTH', tag: '04' },
    ],
  },
  {
    id: 'connect',
    href: '#products',
    tag: '02-CONNECT',
    label: 'RED APPLE CONNECT',
    number: '02',
    description: 'On-demand encrypted telehealth video with vetted OB-GYNs & specialists.',
    gallery: [
      { img: '/red-apple-family.jpg', caption: 'OB-GYN ON CALL', tag: '01' },
      { img: '/red-apple-family.jpg', caption: 'DIGITAL SCRIPTS', tag: '02' },
      { img: '/red-apple-family.jpg', caption: 'ZERO-KNOWLEDGE', tag: '03' },
      { img: '/red-apple-family.jpg', caption: 'FERTILITY DOCTORS', tag: '04' },
    ],
  },
  {
    id: 'os',
    href: '#products',
    tag: '03-OS',
    label: 'RED APPLE OS',
    number: '03',
    description: 'Modern clinic EHR, appointment workflow, and patient practice tools.',
    gallery: [
      { img: '/red-apple-family.jpg', caption: 'CLINIC EHR', tag: '01' },
      { img: '/red-apple-family.jpg', caption: 'ANTENATAL CHARTS', tag: '02' },
      { img: '/red-apple-family.jpg', caption: 'LAB INTEGRATION', tag: '03' },
      { img: '/red-apple-family.jpg', caption: 'SMS ALERTS', tag: '04' },
    ],
  },
  {
    id: 'investors',
    href: '#investors',
    tag: '04-INVESTORS',
    label: 'THE OPPORTUNITY',
    number: '04',
    description: 'Macro drivers, unified flywheel advantage, and investment brief.',
    gallery: [
      { img: '/red-apple-family.jpg', caption: '300M+ WOMEN', tag: '01' },
      { img: '/red-apple-family.jpg', caption: 'FLYWHEEL MOAT', tag: '02' },
      { img: '/red-apple-family.jpg', caption: 'UNIT ECONOMICS', tag: '03' },
      { img: '/red-apple-family.jpg', caption: 'FOUNDER ACCESS', tag: '04' },
    ],
  },
  {
    id: 'traction',
    href: '#traction',
    tag: '05-TRACTION',
    label: 'TRACTION & ROADMAP',
    number: '05',
    description: 'Disciplined execution milestones from protocol validation to scale.',
    gallery: [
      { img: '/red-apple-family.jpg', caption: '50K+ DOWNLOADS', tag: '01' },
      { img: '/red-apple-family.jpg', caption: '180+ SPECIALISTS', tag: '02' },
      { img: '/red-apple-family.jpg', caption: '45+ CLINICS', tag: '03' },
      { img: '/red-apple-family.jpg', caption: 'PAN-AFRICA 2027', tag: '04' },
    ],
  },
  {
    id: 'about',
    href: '#about',
    tag: '06-ABOUT',
    label: 'ABOUT & PURPOSE',
    number: '06',
    description: 'Built for the realities of African maternal and reproductive care.',
    gallery: [
      { img: '/red-apple-family.jpg', caption: 'HEALTH EQUITY', tag: '01' },
      { img: '/red-apple-family.jpg', caption: 'GENERATIONS', tag: '02' },
      { img: '/red-apple-family.jpg', caption: 'RURAL OUTREACH', tag: '03' },
      { img: '/red-apple-family.jpg', caption: 'MATERNAL DIGNITY', tag: '04' },
    ],
  },
];

export const MenuOverlay: React.FC<MenuOverlayProps> = ({
  isOpen,
  onClose,
  brandName = 'RED APPLE',
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const currentItem = MENU_ITEMS[activeIndex] || MENU_ITEMS[0];

  const content = (
    <div className="fixed inset-0 z-[9999] bg-[#FBFBFA] text-neutral-900 font-sans select-none h-screen w-screen overflow-hidden flex flex-col justify-between p-4 sm:p-6 md:px-10 md:py-6 animate-in fade-in duration-150">
      
      {/* ========================================================================= */}
      {/* 1. TOP EDITORIAL HEADER BAR */}
      {/* ========================================================================= */}
      <header className="w-full flex items-start justify-between font-mono text-[10px] sm:text-[11px] uppercase tracking-wider shrink-0 pb-2">
        
        {/* Top-Left Navigation Actions */}
        <div className="space-y-0.5">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 font-bold hover:text-crimson transition-colors cursor-pointer group"
          >
            <span>MENU</span>
            <span className="text-crimson font-black group-hover:rotate-45 transition-transform">—</span>
          </button>
          
          <div className="text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer">
            <a href="#products" onClick={onClose}>THE 3 PILLARS</a>
          </div>

          <div className="text-neutral-400 hover:text-neutral-900 transition-colors cursor-pointer flex items-center gap-1">
            <a href="#investors" onClick={onClose}>INVESTORS</a>
            <span className="text-crimson">+</span>
          </div>
        </div>

        {/* Center Brand Title */}
        <div className="text-center">
          <a
            href="/"
            onClick={onClose}
            className="text-lg sm:text-xl md:text-2xl font-black font-display tracking-tight hover:opacity-80 transition-opacity uppercase inline-block"
          >
            <span>{brandName}</span>
          </a>
        </div>

        {/* Top-Right Secondary Menu */}
        <div className="text-right space-y-0.5">
          <div className="text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer">
            <a href="#contact" onClick={onClose}>TALK TO TEAM</a>
          </div>
          <div className="text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer flex items-center justify-end gap-1">
            <Search className="w-2.5 h-2.5" />
            <span>SEARCH</span>
          </div>
          <div className="text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer">
            <a href="#investors" onClick={onClose}>DECK.0</a>
          </div>
        </div>

      </header>

      {/* ========================================================================= */}
      {/* 2. SPLIT EDITORIAL MENU CANVAS (Fitted strictly inside 100vh) */}
      {/* ========================================================================= */}
      <main className="w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center min-h-0 py-2">
        
        {/* --- LEFT COLUMN: COMPACT BRUTALIST MENU & EDITORIAL PORTRAIT --- */}
        <div className="lg:col-span-5 flex flex-col justify-between h-full max-h-[78vh] py-1">
          
          <div>
            {/* Tag Badge */}
            <div className="font-mono text-[9px] sm:text-[10px] text-neutral-400 font-bold tracking-widest uppercase mb-2">
              {`[ ${currentItem.tag} ]`}
            </div>

            {/* Brutalist Menu Items */}
            <nav className="space-y-1.5 sm:space-y-2">
              {MENU_ITEMS.map((item, idx) => {
                const isActive = activeIndex === idx;
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={onClose}
                    className="group flex items-center justify-between cursor-pointer py-0.5 transition-all block"
                  >
                    {/* Left Label in Brackets */}
                    <div className="flex items-center gap-1.5 font-display text-sm sm:text-base md:text-lg font-black uppercase tracking-tight transition-colors">
                      <span className="text-neutral-400 group-hover:text-crimson font-mono text-xs sm:text-sm">[</span>
                      <span className="inline-flex items-center gap-1.5">
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-crimson inline-block animate-pulse" />
                        )}
                        <span className={isActive ? 'text-neutral-900' : 'text-neutral-500 group-hover:text-neutral-900'}>
                          {item.label}
                        </span>
                      </span>
                      <span className="text-neutral-400 group-hover:text-crimson font-mono text-xs sm:text-sm">]</span>
                    </div>

                    {/* Right Number in Brackets */}
                    <div className="font-mono text-[10px] sm:text-xs font-bold text-neutral-400 group-hover:text-crimson transition-colors">
                      {`[ ${item.number} ]`}
                    </div>
                  </a>
                );
              })}
            </nav>
          </div>

          {/* Left Model Photo Cutout */}
          <div className="relative pt-2">
            <div className="relative w-36 sm:w-44 md:w-48 aspect-[4/5] overflow-hidden rounded-xs bg-neutral-200 shadow-md">
              <img
                src="/red-apple-family.jpg"
                alt="Editorial Model"
                className="w-full h-full object-cover filter grayscale contrast-125 brightness-95"
              />
              <div className="absolute bottom-1.5 left-1.5 font-mono text-[8px] text-white/90 bg-black/70 px-1 py-0.2 uppercase tracking-widest">
                [ 01 // EDITORIAL ]
              </div>
            </div>
          </div>

        </div>

        {/* --- RIGHT COLUMN: STAGGERED EDITORIAL SHOWCASE CARDS --- */}
        <div className="lg:col-span-7 h-full max-h-[78vh] flex items-center justify-center relative pl-0 lg:pl-4">
          
          <div className="w-full h-full flex items-center justify-center gap-3 sm:gap-4 md:gap-5 overflow-hidden">
            
            {/* Card 1 */}
            <div className="w-28 sm:w-36 md:w-40 shrink-0 transform -translate-y-6 sm:-translate-y-8 hover:scale-105 transition-transform duration-300">
              <div className="bg-white p-1.5 shadow-lg border border-neutral-100">
                <div className="w-full aspect-[3/4] overflow-hidden bg-neutral-100">
                  <img
                    src={currentItem.gallery[0]?.img || '/red-apple-family.jpg'}
                    alt={currentItem.gallery[0]?.caption}
                    className="w-full h-full object-cover filter grayscale contrast-130 brightness-95"
                  />
                </div>
                <div className="pt-1 font-mono text-[8px] sm:text-[9px] text-neutral-600 uppercase tracking-wider flex justify-between">
                  <span className="truncate pr-1">{currentItem.gallery[0]?.caption}</span>
                  <span className="text-neutral-400">#01</span>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="w-28 sm:w-36 md:w-40 shrink-0 transform translate-y-4 sm:translate-y-6 hover:scale-105 transition-transform duration-300">
              <div className="bg-white p-1.5 shadow-lg border border-neutral-100">
                <div className="w-full aspect-[3/4] overflow-hidden bg-neutral-100">
                  <img
                    src={currentItem.gallery[1]?.img || '/red-apple-family.jpg'}
                    alt={currentItem.gallery[1]?.caption}
                    className="w-full h-full object-cover filter grayscale contrast-130 brightness-95"
                  />
                </div>
                <div className="pt-1 font-mono text-[8px] sm:text-[9px] text-neutral-600 uppercase tracking-wider flex justify-between">
                  <span className="truncate pr-1">{currentItem.gallery[1]?.caption}</span>
                  <span className="text-neutral-400">#02</span>
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="w-28 sm:w-36 md:w-40 shrink-0 transform -translate-y-3 sm:-translate-y-4 hover:scale-105 transition-transform duration-300 hidden sm:block">
              <div className="bg-white p-1.5 shadow-lg border border-neutral-100">
                <div className="w-full aspect-[3/4] overflow-hidden bg-neutral-100">
                  <img
                    src={currentItem.gallery[2]?.img || '/red-apple-family.jpg'}
                    alt={currentItem.gallery[2]?.caption}
                    className="w-full h-full object-cover filter grayscale contrast-130 brightness-95"
                  />
                </div>
                <div className="pt-1 font-mono text-[8px] sm:text-[9px] text-neutral-600 uppercase tracking-wider flex justify-between">
                  <span className="truncate pr-1">{currentItem.gallery[2]?.caption}</span>
                  <span className="text-neutral-400">#03</span>
                </div>
              </div>
            </div>

            {/* Card 4 */}
            <div className="w-28 sm:w-36 md:w-40 shrink-0 transform translate-y-6 sm:translate-y-8 hover:scale-105 transition-transform duration-300 hidden md:block">
              <div className="bg-white p-1.5 shadow-lg border border-neutral-100">
                <div className="w-full aspect-[3/4] overflow-hidden bg-neutral-100">
                  <img
                    src={currentItem.gallery[3]?.img || '/red-apple-family.jpg'}
                    alt={currentItem.gallery[3]?.caption}
                    className="w-full h-full object-cover filter grayscale contrast-130 brightness-95"
                  />
                </div>
                <div className="pt-1 font-mono text-[8px] sm:text-[9px] text-neutral-600 uppercase tracking-wider flex justify-between">
                  <span className="truncate pr-1">{currentItem.gallery[3]?.caption}</span>
                  <span className="text-neutral-400">#04</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* ========================================================================= */}
      {/* 3. BOTTOM CLEAN FOOTER BAR */}
      {/* ========================================================================= */}
      <footer className="w-full pt-2 border-t border-neutral-200/80 flex flex-wrap justify-between items-center text-[9px] sm:text-[10px] font-mono text-neutral-500 uppercase tracking-widest shrink-0">
        <div className="flex items-center gap-3">
          <a href="#contact" onClick={onClose} className="hover:text-neutral-900 transition-colors">TALK TO TEAM</a>
          <span>•</span>
          <a href="#investors" onClick={onClose} className="hover:text-neutral-900 transition-colors">INVESTORS</a>
          <span>•</span>
          <a href="#about" onClick={onClose} className="hover:text-neutral-900 transition-colors">ABOUT US</a>
        </div>

        <div className="flex items-center gap-3">
          <span>(NG / PAN-AFRICA)</span>
          <span className="text-neutral-400 hidden sm:inline">AES-256 ENCRYPTION</span>
        </div>
      </footer>

    </div>
  );

  return createPortal(content, document.body);
};
