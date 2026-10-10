import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';

interface CharItem {
  el: HTMLElement;
  cx: number;
  cy: number;
  rest: number;
  near: number;
  last: number;
  radius: number;
  isSerif: boolean;
  setWeight: (val: number) => void;
}

interface KineticHeroTextProps {
  line1?: string;
  line2Sans: string;
  line2Serif: string;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
  className?: string;
  fontSizeClass?: string;
}

export const KineticHeroText: React.FC<KineticHeroTextProps> = ({
  line1,
  line2Sans,
  line2Serif,
  headingRef,
  className = '',
  fontSizeClass = 'text-[clamp(26px,4.2vw,56px)]',
}) => {
  const localContainerRef = useRef<HTMLHeadingElement>(null);
  const containerRef = headingRef || localContainerRef;
  const charsRef = useRef<CharItem[]>([]);
  const pointerRef = useRef({ x: -2000, y: -2000 });
  const isInsideRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Respect user motion preferences and device capabilities
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (prefersReducedMotion || !canHover) return;

    const container = containerRef.current;
    if (!container) return;

    const charNodes = container.querySelectorAll<HTMLElement>('.kinetic-char');
    const items: CharItem[] = [];

    charNodes.forEach((el) => {
      const isSerif = el.getAttribute('data-serif') === 'true';

      // Extrafazant baseline: Sans rests at 800 and thins to 200 near cursor.
      // Serif rests at 300 and swells to 800 near cursor.
      const rest = isSerif ? 300 : 800;
      const near = isSerif ? 800 : 200;
      const radius = 320;

      el.style.setProperty('--char-wght', rest.toString());
      el.style.fontWeight = `var(--char-wght, ${rest})`;
      el.style.fontVariationSettings = isSerif
        ? `'wght' var(--char-wght, 300), 'opsz' 72`
        : `'wght' var(--char-wght, 800)`;

      items.push({
        el,
        cx: 0,
        cy: 0,
        rest,
        near,
        last: rest,
        radius,
        isSerif,
        setWeight: gsap.quickTo(el, '--char-wght', {
          duration: 0.4,
          ease: 'power2.out',
          overwrite: 'auto',
        }),
      });
    });

    charsRef.current = items;

    // Measure character center coordinates in document space
    const updateCoordinates = () => {
      for (let i = 0; i < items.length; i++) {
        const rect = items[i].el.getBoundingClientRect();
        items[i].cx = rect.left + rect.width / 2 + window.scrollX;
        items[i].cy = rect.top + rect.height / 2 + window.scrollY;
      }
    };

    updateCoordinates();
    if (document.fonts?.ready) {
      document.fonts.ready.then(updateCoordinates).catch(() => {});
    }

    const handlePointerEnter = (e: PointerEvent) => {
      isInsideRef.current = true;
      updateCoordinates();
      pointerRef.current.x = e.pageX;
      pointerRef.current.y = e.pageY;
    };

    const handlePointerMove = (e: PointerEvent) => {
      isInsideRef.current = true;
      pointerRef.current.x = e.pageX;
      pointerRef.current.y = e.pageY;
    };

    const handlePointerLeave = () => {
      isInsideRef.current = false;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (Math.abs(item.rest - item.last) >= 1) {
          item.last = item.rest;
          item.setWeight(item.rest);
        }
      }
    };

    // Smooth ticker loop matching Extrafazant's lightweight dirty-check animation
    const onTick = () => {
      if (!isInsideRef.current) return;

      const pX = pointerRef.current.x;
      const pY = pointerRef.current.y;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const dist = Math.hypot(pX - item.cx, pY - item.cy);

        let targetWeight: number;
        if (dist < item.radius) {
          const factor = 1 - dist / item.radius;
          // Smooth sinusoidal ease
          const curve = Math.sin((factor * Math.PI) / 2);
          targetWeight = item.rest + (item.near - item.rest) * curve;
        } else {
          targetWeight = item.rest;
        }

        // Only call GSAP when weight changes by at least 1 unit (avoids frame drops)
        if (Math.abs(targetWeight - item.last) >= 1) {
          item.last = targetWeight;
          item.setWeight(targetWeight);
        }
      }
    };

    gsap.ticker.add(onTick);
    container.addEventListener('pointerenter', handlePointerEnter, { passive: true });
    container.addEventListener('pointermove', handlePointerMove, { passive: true });
    container.addEventListener('pointerleave', handlePointerLeave, { passive: true });
    window.addEventListener('resize', updateCoordinates, { passive: true });
    window.addEventListener('scroll', updateCoordinates, { passive: true });

    return () => {
      gsap.ticker.remove(onTick);
      container.removeEventListener('pointerenter', handlePointerEnter);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('resize', updateCoordinates);
      window.removeEventListener('scroll', updateCoordinates);
      items.forEach((item) => {
        gsap.killTweensOf(item.el);
      });
    };
  }, [containerRef]);

  const renderWords = (text: string, isSerif: boolean = false) => {
    const words = text.split(' ');
    return words.map((word, wIdx) => (
      <span key={wIdx} className="inline-block whitespace-nowrap">
        {word.split('').map((char, cIdx) => (
          <span
            key={cIdx}
            data-serif={isSerif ? 'true' : 'false'}
            className={`kinetic-char inline-block select-none ${
              isSerif ? 'font-editorial italic' : 'font-sans font-extrabold tracking-tight'
            }`}
            style={{
              verticalAlign: 'baseline',
              lineHeight: 'inherit',
            }}
          >
            {char}
          </span>
        ))}
        {wIdx < words.length - 1 && (
          <span className="inline-block w-[0.25em]">&nbsp;</span>
        )}
      </span>
    ));
  };

  return (
    <h1
      ref={containerRef}
      className={`w-full tracking-tight uppercase select-none cursor-default ${className}`}
      style={{
        lineHeight: 0.96,
      }}
    >
      {/* Line 1: Bold Sans with Variable Font Weight Modulation (No ScaleX, Zero Overlap) */}
      {line1 && (
        <span className={`block font-sans font-extrabold text-neutral-950 ${fontSizeClass} leading-[0.98] tracking-tight`}>
          {renderWords(line1, false)}
        </span>
      )}

      {/* Line 2: Mixed Pairing (Bold Sans + High-Contrast Editorial Serif) */}
      <span className={`block ${fontSizeClass} leading-[0.98] ${line1 ? 'mt-1 sm:mt-1.5' : ''}`}>
        {line2Sans && (
          <span className="mr-2 sm:mr-3.5 inline-block">
            {renderWords(line2Sans, false)}
          </span>
        )}
        {line2Serif && (
          <span className="tracking-tight inline-block">
            {renderWords(line2Serif, true)}
          </span>
        )}
      </span>
    </h1>
  );
};
