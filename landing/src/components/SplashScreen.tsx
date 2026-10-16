import React, { useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';

interface SplashScreenProps {
  /** Set to true to trigger a page transition */
  isTransitioning?: boolean;
  /** Called at the exact moment the screen is 100% covered in crimson red */
  onCovered?: () => void;
  /** Called when the exit transition finishes and the new page is revealed */
  onComplete?: () => void;
  /** Whether to play on initial page mount (default: true) */
  playOnInitialLoad?: boolean;
}

// Extrafazant signature squiggly loop path (1000x1000 coordinate space)
const EXTRAFAZANT_SQUIGGLE_PATH =
  'M43 259C296 11.5688 994 -3 922.994 498.259C851.988 999.517 281.229 1004.28 123 767C-35.2287 529.721 179 259 472 259C765 259 792 498.259 659 654C526 809.741 319 755 285 669.001C251 583.001 299 452 496 452C693 452 876.073 639.171 935 937.001';

// Exact arc length of this curve is ~5050px
const DEFAULT_PATH_LENGTH = 5050;

export const SplashScreen: React.FC<SplashScreenProps> = ({
  isTransitioning = false,
  onCovered,
  onComplete,
  playOnInitialLoad = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const isRunningRef = useRef(false);

  // Store callbacks in refs to avoid re-triggering animation on parent re-renders
  const onCoveredRef = useRef(onCovered);
  onCoveredRef.current = onCovered;

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Helper to apply DrawSVG stroke states safely
  const applyStroke = useCallback((startRatio: number, endRatio: number, strokeWidthVal: number) => {
    const pathEl = pathRef.current;
    if (!pathEl) return;
    const len = pathEl.getTotalLength ? pathEl.getTotalLength() || DEFAULT_PATH_LENGTH : DEFAULT_PATH_LENGTH;
    const s = Math.max(0, Math.min(1, startRatio));
    const e = Math.max(0, Math.min(1, endRatio));
    const visibleLen = Math.max(0, (e - s) * len);

    // Large gap prevents dash pattern from ever repeating
    pathEl.style.strokeDasharray = `${visibleLen.toFixed(1)} ${Math.round(len * 3)}`;
    pathEl.style.strokeDashoffset = `${(-s * len).toFixed(1)}`;
    pathEl.setAttribute('stroke-width', strokeWidthVal.toFixed(1));
  }, []);

  const runAnimation = useCallback(() => {
    const pathEl = pathRef.current;
    const container = containerRef.current;
    if (!pathEl || !container) return;

    if (timelineRef.current) {
      timelineRef.current.kill();
    }
    isRunningRef.current = true;

    // Ensure container is immediately visible
    gsap.set(container, { autoAlpha: 1 });

    const animState = {
      startRatio: 0,
      endRatio: 0,
      strokeWidth: 45,
    };

    applyStroke(0, 0, 45);

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(container, { autoAlpha: 0 });
        applyStroke(0, 0, 45);
        isRunningRef.current = false;
        onCompleteRef.current?.();
      },
    });
    timelineRef.current = tl;

    // 1. IN PHASE: Crimson squiggly line draws in and balloons to 420px (full-bleed coverage)
    tl.to(
      animState,
      {
        endRatio: 1,
        duration: 0.72,
        ease: 'power2.inOut',
        onUpdate: () => applyStroke(animState.startRatio, animState.endRatio, animState.strokeWidth),
      },
      0
    );

    tl.to(
      animState,
      {
        strokeWidth: 420,
        duration: 0.55,
        ease: 'power2.inOut',
        onUpdate: () => applyStroke(animState.startRatio, animState.endRatio, animState.strokeWidth),
      },
      0.15
    );

    // 2. MIDPOINT: Screen is 100% solid Crimson Red -> trigger page swap
    tl.add(() => {
      onCoveredRef.current?.();
    }, 0.72);

    // Brief 80ms buffer while covered
    tl.to({}, { duration: 0.08 });

    // 3. OUT PHASE: Start ratio catches up and exits along the loop path
    tl.to(
      animState,
      {
        startRatio: 1,
        duration: 0.72,
        ease: 'power2.inOut',
        onUpdate: () => applyStroke(animState.startRatio, animState.endRatio, animState.strokeWidth),
      },
      0.80
    );

    tl.to(
      animState,
      {
        strokeWidth: 45,
        duration: 0.52,
        ease: 'power2.inOut',
        onUpdate: () => applyStroke(animState.startRatio, animState.endRatio, animState.strokeWidth),
      },
      0.98
    );
  }, [applyStroke]);

  // Initial page load transition
  useEffect(() => {
    if (playOnInitialLoad) {
      runAnimation();
    }
    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
      isRunningRef.current = false;
    };
  }, [playOnInitialLoad, runAnimation]);

  // Page transition trigger
  useEffect(() => {
    if (isTransitioning) {
      runAnimation();
    }
  }, [isTransitioning, runAnimation]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[1000] pointer-events-none select-none overflow-clip"
      style={{
        opacity: playOnInitialLoad ? 1 : 0,
        visibility: playOnInitialLoad ? 'visible' : 'hidden',
      }}
      aria-label="Page transition"
      role="presentation"
    >
      {/* Extrafazant Signature Shape Container with Crimson Red color */}
      <div className="w-full h-full text-[#C81E3A] absolute top-0 left-0 pointer-events-none">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1000 1000"
          fill="none"
          preserveAspectRatio="none"
          className="w-[130%] h-[130%] absolute -top-[15%] -left-[15%] pointer-events-none"
        >
          <path
            ref={pathRef}
            d={EXTRAFAZANT_SQUIGGLE_PATH}
            stroke="currentColor"
            strokeWidth="45"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="will-change-[stroke-dasharray,stroke-dashoffset,stroke-width]"
          />
        </svg>
      </div>
    </div>
  );
};
