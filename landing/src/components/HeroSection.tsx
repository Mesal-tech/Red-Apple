import React, { useRef, useEffect } from 'react';

interface CardItem {
  id: string;
  image: string;
  title: string;
}

const HERO_CARDS: CardItem[] = [
  {
    id: '1',
    image: '/images/maternal-wellness.jpg',
    title: 'Maternal Wellbeing',
  },
  {
    id: '2',
    image: '/images/clinical-care.jpg',
    title: 'Clinical Protocols',
  },
  {
    id: '3',
    image: '/images/merch-polaroid.jpg',
    title: 'Care Artifacts',
  },
  {
    id: '4',
    image: '/images/pillar-connect.jpg',
    title: 'Telemedicine',
  },
  {
    id: '5',
    image: '/images/community-outreach.jpg',
    title: 'Grassroots Access',
  },
  {
    id: '6',
    image: '/images/card-community.jpg',
    title: 'Maternal Outreach',
  },
  {
    id: '7',
    image: '/images/about-clinic-entrance.jpg',
    title: 'Clinical Hub',
  },
  {
    id: '8',
    image: '/images/team-chisomebi.jpg',
    title: 'Frontline Specialists',
  },
  {
    id: '9',
    image: '/images/team-polaroid.jpg',
    title: 'Care Collective',
  },
];

interface HeroSectionProps {
  brandName?: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  brandName: _brandName = 'RED APPLE',
}) => {
  const containerRef = useRef<HTMLElement>(null);
  const cardElementsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const numCards = HERO_CARDS.length;
    let targetNormX = 0.5;
    let targetNormY = 0.5;
    let currentNormX = 0.5;
    let currentNormY = 0.5;
    let animationFrameId: number;

    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    const updateCards = () => {
      // Lerp for organic glide
      currentNormX += (targetNormX - currentNormX) * 0.08;
      currentNormY += (targetNormY - currentNormY) * 0.08;

      const normX = currentNormX;
      const normY = currentNormY;
      const focalIndex = normX * (numCards - 1);
      const centerIndex = (numCards - 1) / 2;

      cardElementsRef.current.forEach((el, i) => {
        if (!el) return;

        const dist = Math.abs(i - focalIndex);
        const centerOffset = i - centerIndex;

        // Dynamic depth blur matching avecanni.studio:
        // Focal card is 0px blur; outer cards progressively blur up to ~6px
        const blurAmount = Math.min(6.0, Math.pow(dist * 1.35, 1.25) * 1.2);

        // Subtle elevation scale (max 1.05 so it never expands into text)
        const scale = 1 + Math.max(0, (1 - dist / 2.0) * 0.05);

        // Z-Index: cards near cursor are brought to the front
        const zIndex = Math.round(50 - dist * 8);

        // Atmospheric depth opacity
        const opacity = Math.max(0.72, 1 - dist * 0.035);

        // Horizontal parallax shift & gentle perspective fan
        const parallaxX = (normX - 0.5) * -55 + centerOffset * (normX - 0.5) * 4;
        // Strictly flat baseline with only gentle mouse Y reaction (no upward arc into headline)
        const translateY = (normY - 0.5) * 6;
        const rot = centerOffset * 1.4 + (normX - 0.5) * 3.5;

        el.style.transform = `translate3d(${parallaxX.toFixed(1)}px, ${translateY.toFixed(1)}px, 0px) scale(${scale.toFixed(3)}) rotate(${rot.toFixed(1)}deg)`;
        el.style.filter = `blur(${blurAmount.toFixed(1)}px)`;
        el.style.opacity = `${opacity.toFixed(2)}`;
        el.style.zIndex = `${zIndex}`;
      });

      animationFrameId = requestAnimationFrame(updateCards);
    };

    // Run first frame immediately
    updateCards();

    if (canHover) {
      const handleMouseMove = (e: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        targetNormX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        targetNormY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      };

      const handleMouseLeave = () => {
        targetNormX = 0.5;
        targetNormY = 0.5;
      };

      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      container.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
      };
    } else {
      let time = 0;
      let isTouching = false;

      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length > 0) {
          isTouching = true;
          const touch = e.touches[0];
          const rect = container.getBoundingClientRect();
          targetNormX = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
          targetNormY = Math.max(0, Math.min(1, (touch.clientY - rect.top) / rect.height));
        }
      };

      const handleTouchEnd = () => {
        isTouching = false;
      };

      container.addEventListener('touchstart', handleTouchMove, { passive: true });
      container.addEventListener('touchmove', handleTouchMove, { passive: true });
      container.addEventListener('touchend', handleTouchEnd, { passive: true });
      container.addEventListener('touchcancel', handleTouchEnd, { passive: true });

      const ambientLoop = () => {
        if (!isTouching) {
          time += 0.02;
          targetNormX = 0.5 + Math.sin(time) * 0.2;
          targetNormY = 0.5 + Math.cos(time * 0.8) * 0.08;
        }
        updateCards();
      };
      animationFrameId = requestAnimationFrame(ambientLoop);

      return () => {
        cancelAnimationFrame(animationFrameId);
        container.removeEventListener('touchstart', handleTouchMove);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
        container.removeEventListener('touchcancel', handleTouchEnd);
      };
    }
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative w-full h-[100dvh] min-h-[580px] max-h-[880px] lg:max-h-none lg:h-screen bg-white text-neutral-950 flex flex-col justify-between px-6 sm:px-10 lg:px-14 pt-24 sm:pt-26 md:pt-20 lg:pt-22 pb-6 sm:pb-6 md:pb-7 overflow-hidden select-none"
    >
      {/* 1. TOP ZONE: Editorial 3-Line Asymmetric Headline with guaranteed margin below */}
      <div className="w-full max-w-6xl mx-auto z-10 shrink-0 mb-3 md:mb-6">
        <h1 className="font-sans text-[20px] sm:text-2xl md:text-[34px] lg:text-[38px] xl:text-[42px] font-normal tracking-[-0.03em] text-neutral-950 leading-[1.22] md:leading-[1.14]">
          {/* Line 1: Indented to align with center-right */}
          <span className="block pl-[8%] sm:pl-[16%] md:pl-[30%] lg:pl-[36%] xl:pl-[40%] md:whitespace-nowrap">
            A clinician-led maternal
          </span>
          {/* Line 2: Across from left margin */}
          <span className="block mt-1 sm:mt-1.5 md:whitespace-nowrap">
            healthcare collective working with women
          </span>
          {/* Line 3: Anchored left conclusion */}
          <span className="block mt-1 sm:mt-1.5 md:whitespace-nowrap">
            who are building something generational.
          </span>
        </h1>
      </div>

      {/* 2. CENTER ZONE: Interactive Mouse & Touch Fanned Card Cascade */}
      <div className="w-full my-auto py-2 md:py-6 flex items-center justify-center relative z-20 shrink-0">
        <div className="flex items-center justify-center -space-x-26 sm:-space-x-28 md:-space-x-11 lg:-space-x-13 xl:-space-x-15">
          {HERO_CARDS.map((card, idx) => (
            <div
              key={card.id}
              ref={(el) => { cardElementsRef.current[idx] = el; }}
              className="relative w-48 sm:w-52 md:w-28 lg:w-32 xl:w-34 aspect-[3/4.2] rounded-3xl md:rounded-2xl overflow-hidden shadow-[0_16px_36px_rgba(0,0,0,0.16)] md:shadow-[0_10px_24px_rgba(0,0,0,0.12)] border border-black/[0.04] bg-neutral-100 cursor-pointer transition-shadow duration-300 hover:shadow-[0_18px_36px_rgba(0,0,0,0.18)] shrink-0 will-change-transform"
            >
              {/* Pure, clean image without dark gradients or text banners */}
              <img
                src={card.image}
                alt={card.title}
                className="w-full h-full object-cover select-none pointer-events-none"
                loading="eager"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 3. BOTTOM ZONE: Lowercase Wordmark (Right) with guaranteed margin above */}
      <div className="w-full flex justify-end mt-4 sm:mt-6 z-10 shrink-0">
        {/* Bottom Right: Iconic massive wordmark matching avec anni™ */}
        <div className="text-right leading-none select-none">
          <span className="font-sans font-black text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[80px] text-neutral-950 tracking-tighter leading-[0.85] inline-flex items-start">
            Red Apple
            <span className="text-[9px] sm:text-[11px] md:text-xs font-bold text-neutral-400 mt-1 sm:mt-1.5 ml-0.5 sm:ml-1">
              ™
            </span>
          </span>
        </div>
      </div>
    </section>
  );
};
