import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, TrendingUp } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface TractionCardData {
  id: string;
  type: 'square' | 'landscape';
  bgColor: string;
  textColor: string;
  subTextColor: string;
  phaseTag: string;
  tagColor: string;
  quote: string;
  authorName: string;
  authorRole: string;
  authorBadge?: string;
  image?: string;
  statNumber?: string;
  statLabel?: string;
  statsGrid?: Array<{ value: string; label: string }>;
  isLink?: boolean;
}

const CARDS_DATA: TractionCardData[] = [
  // 1. Warm Ecru / Bone (Fast Company style - Screenshot 1)
  {
    id: 'card-bone',
    type: 'square',
    bgColor: '#E5E3D8',
    textColor: '#191919',
    subTextColor: '#555555',
    phaseTag: 'PHASE 1 // WELLNESS PLATFORM',
    tagColor: '#059669',
    quote:
      '“Red Apple just gets it right. It is consistently so much better than traditional health portals, it’ll blow your mind.”',
    authorName: 'Fast Company',
    authorRole: 'Pan-African Health Innovation Review',
    authorBadge: 'FC',
  },
  // 2. Soft Lilac (Glenn Solomon style - Screenshot 2)
  {
    id: 'card-lilac',
    type: 'landscape',
    bgColor: '#E9D5FF',
    textColor: '#191919',
    subTextColor: '#555555',
    phaseTag: 'PHASE 2 // TELEHEALTH NETWORK',
    tagColor: '#7C3AED',
    quote:
      '“Red Apple = life savings! This is the best maternal product I’ve ever used because it’s fast and it just works. I can’t wait for more to come from the company!”',
    authorName: 'Glenn Solomon',
    authorRole: 'Managing Partner, Notable Capital',
    image: '/images/clinical-care.jpg',
    statNumber: '12 Min',
    statLabel: 'Specialist Triage',
  },
  // 3. Deep Forest Green (Elena Verna style - Screenshot 3)
  {
    id: 'card-forest',
    type: 'landscape',
    bgColor: '#064E3B',
    textColor: '#FFFFFF',
    subTextColor: '#A7F3D0',
    phaseTag: 'PHASE 3 // DIAGNOSTIC ACCURACY',
    tagColor: '#34D399',
    quote:
      '“I feel like I have no time to wait in hospital queues anymore. So I just talk to my phone and my doctor on Red Apple all the time.”',
    authorName: 'Elena Verna',
    authorRole: 'Head of Growth at Lovable',
    image: '/images/card-telehealth.jpg',
    statNumber: '70%',
    statLabel: 'Fewer Complications',
  },
  // 4. Vibrant Mint (Tuhin Srivastava style - Screenshot 4)
  {
    id: 'card-mint',
    type: 'landscape',
    bgColor: '#34D399',
    textColor: '#064E3B',
    subTextColor: '#047857',
    phaseTag: 'PHASE 4 // SPECIALIST NETWORK',
    tagColor: '#065F46',
    quote:
      '“I’ve never seen a clinical platform adopted this fast. In particular across both frontline midwives and specialist OB-GYNs.”',
    authorName: 'Tuhin Srivastava',
    authorRole: 'Co-Founder & CEO, Baseten',
    image: '/images/community-outreach.jpg',
    statNumber: '180+',
    statLabel: 'Licensed OB-GYNs',
  },
  // 5. Coral Red (Clay Case Study style - Screenshot 5)
  {
    id: 'card-coral',
    type: 'landscape',
    bgColor: '#FF5722',
    textColor: '#FFFFFF',
    subTextColor: '#FED7AA',
    phaseTag: 'PHASE 5 // PAN-AFRICAN SCALE',
    tagColor: '#FFEDD5',
    quote:
      '“Red Apple is a top favorite healthcare tool for our community. We literally do not use paper cards or manual triage anymore.”',
    authorName: 'Clay Health Directorate',
    authorRole: 'Pan-African Regional Care Pilot',
    statsGrid: [
      { value: '20%', label: 'more clinical visits per day' },
      { value: '$3.08m', label: 'estimated annual health savings' },
    ],
    isLink: true,
  },
];

export const TractionSection: React.FC = () => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const stRef = useRef<ScrollTrigger | null>(null);

  const scrollToCard = (index: number) => {
    if (stRef.current) {
      const st = stRef.current;
      const progress = index / (CARDS_DATA.length - 1);
      const targetScroll = st.start + (st.end - st.start) * progress;
      window.scrollTo({
        top: targetScroll,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;

    let scrollTween: gsap.core.Tween | null = null;
    let rebuildTimer: ReturnType<typeof setTimeout> | null = null;

    // Wispr Flow exact parameters
    const MIN_W = 768;
    const GAP_PCT = 14;
    const GAP_PCT_MOBILE = 20;
    const GAP_MIN_PX = 32;
    const GAP_MAX_PX = 160;
    const SCROLL_RATIO = 0.85;

    const ORBIT_CARD_PCT = 65;
    const ORBIT_MIN_PX = 220;
    const PERSP_CARD_PCT = 260;
    const ROT_ANGLE = 45; // 45 degrees pitch
    const ROT_SPAN_PCT = 210;

    function build() {
      if (scrollTween) {
        if (scrollTween.scrollTrigger) {
          scrollTween.scrollTrigger.kill();
        }
        scrollTween.kill();
        scrollTween = null;
      }

      const cards = Array.from(track!.querySelectorAll<HTMLDivElement>('[data-slider="card"]'));
      if (!cards.length) return;

      const vw = window.innerWidth;
      const mobile = vw < MIN_W;
      const scrubVal = mobile ? 0.3 : 1.5;
      const gapPct = mobile ? GAP_PCT_MOBILE : GAP_PCT;
      const centerVh = mobile ? 52 : 52;

      track!.style.opacity = '1';

      // Card initial styling & measurements
      cards.forEach((card) => {
        card.style.position = 'absolute';
        card.style.left = '50%';
        card.style.top = `${centerVh}vh`;
        card.style.transformStyle = 'preserve-3d';
        card.style.backfaceVisibility = 'hidden';
        card.style.willChange = 'transform';
        card.style.margin = '0';
      });

      const widths = cards.map((c) => c.offsetWidth || 500);
      const sorted = [...widths].sort((a, b) => a - b);
      const medW = sorted[Math.floor(sorted.length / 2)] || 500;

      function gapFor(w: number) {
        return Math.min(GAP_MAX_PX, Math.max(GAP_MIN_PX, (w * gapPct) / 100));
      }
      const gapPx = gapFor(medW);

      const offsets: number[] = [0];
      for (let i = 1; i < cards.length; i++) {
        const pairW = (widths[i - 1] + widths[i]) / 2;
        offsets[i] = offsets[i - 1] + pairW + gapPx;
      }
      const spanPx = offsets[offsets.length - 1];

      const orbitPx = Math.max(ORBIT_MIN_PX, (medW * ORBIT_CARD_PCT) / 100);
      const perspPx = (medW * PERSP_CARD_PCT) / 100;

      track!.style.perspective = `${perspPx}px`;
      track!.style.transformStyle = 'preserve-3d';

      gsap.set(cards, {
        xPercent: -50,
        yPercent: -50,
        transformOrigin: `50% 50% -${orbitPx}px`,
        force3D: true,
      });

      const rotEase = gsap.parseEase('power1.inOut');
      const RAD = Math.PI / 180;
      const rotHalf = (medW * ROT_SPAN_PCT) / 100;

      // Wispr Flow wave slider diagonal orbit trajectory:
      // Entering from TOP-RIGHT (sx > 0): rot is +ROT_ANGLE (+45deg).
      //   Because pivot is -orbitPx behind card: delta_y = -orbitPx * sin(+45) < 0 (UP into top-right).
      // Center Stage (sx = 0): rot = 0deg, facing directly forward.
      // Exiting to BOTTOM-LEFT (sx < 0): rot is -ROT_ANGLE (-45deg).
      //   delta_y = -orbitPx * sin(-45) > 0 (DOWN into bottom-left).
      function rotAt(sx: number) {
        let p = (sx + rotHalf) / (rotHalf * 2);
        p = p < 0 ? 0 : p > 1 ? 1 : p;
        // p = 0 (far left) -> -ROT_ANGLE (-45)
        // p = 0.5 (center) -> 0
        // p = 1 (far right) -> +ROT_ANGLE (+45)
        return -ROT_ANGLE + (ROT_ANGLE * 2) * rotEase(p);
      }

      function shrinkAt(sx: number) {
        const rot = rotAt(sx);
        const depth = orbitPx * (1 - Math.cos(rot * RAD));
        return perspPx / (perspPx + depth);
      }

      function render(head: number) {
        for (let j = 0; j < cards.length; j++) {
          // As user scrolls DOWN, head increases from 0 to spanPx.
          // Card 0 starts at u = 0 (center) and moves to negative (bottom-left).
          // Card 1 starts at u = offsets[1] > 0 (top-right) and moves to 0 (center).
          const u = offsets[j] - head;
          const sx = u;
          const rot = rotAt(sx);
          const f = shrinkAt(sx);
          (cards[j] as any)._x = sx;
          gsap.set(cards[j], {
            x: sx / f,
            rotateX: rot,
          });
        }
        restack();
      }

      function restack() {
        const order = cards.slice().sort((a, b) => {
          return Math.abs((a as any)._x || 0) - Math.abs((b as any)._x || 0);
        });
        order.forEach((card, rank) => {
          card.style.zIndex = String(order.length - rank + 10);
        });
      }

      // Exact height calculation from Wispr Flow
      const trackH = track!.offsetHeight || window.innerHeight;
      wrap!.style.height = `${Math.round(trackH + spanPx * SCROLL_RATIO)}px`;

      const proxy = { h: 0 };
      render(0);

      scrollTween = gsap.to(proxy, {
        h: spanPx,
        ease: 'none',
        onUpdate: () => {
          render(proxy.h);
        },
        scrollTrigger: {
          trigger: wrap,
          start: 'top top',
          end: 'bottom bottom',
          pin: track,
          pinSpacing: true,
          scrub: scrubVal,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            // Spin badge with scroll
            if (badgeRef.current) {
              gsap.set(badgeRef.current, { rotation: self.progress * 360 });
            }
          },
        },
      });

      stRef.current = scrollTween.scrollTrigger || null;
    }

    build();

    let lastW = window.innerWidth;
    const handleResize = () => {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      if (rebuildTimer) clearTimeout(rebuildTimer);
      rebuildTimer = setTimeout(() => {
        build();
        ScrollTrigger.refresh();
      }, 200);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (rebuildTimer) clearTimeout(rebuildTimer);
      if (scrollTween) {
        if (scrollTween.scrollTrigger) scrollTween.scrollTrigger.kill();
        scrollTween.kill();
      }
      stRef.current = null;
    };
  }, []);

  return (
    <section
      id="traction"
      data-nav-theme="dark"
      className="relative z-10 w-full bg-[#18181A] text-white select-none overflow-x-clip"
    >
      {/* 1. Normal Scrolling Header (NOT PINNED — scrolls naturally with the page like Wispr Flow) */}
      <div className="w-full pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 sm:px-8 text-center max-w-3xl mx-auto space-y-2 relative z-10">
        <div className="inline-block text-xs sm:text-sm font-medium text-neutral-400 tracking-tight">
          Early access, real results
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[54px] font-normal tracking-tight text-white leading-tight font-sans">
          <span>Why teams choose</span>{' '}
          <span className="font-editorial italic font-normal text-white">
            Red Apple.
          </span>
        </h2>
      </div>

      {/* 2. Pinned 3D Wave Slider Container */}
      <div ref={wrapRef} className="relative w-full overflow-visible">
        {/* Pinned 3D Stage (100vh with overflow-visible so top-right & bottom-left cards don't clip) */}
        <div
          ref={trackRef}
          data-slider="track"
          className="w-full h-screen max-h-screen relative overflow-visible flex items-center justify-center px-4 sm:px-8"
        >
          {/* 3D Wave Slider Cards (Directly centered in track at 50vh) */}
          {CARDS_DATA.map((card, index) => {
            const isSquare = card.type === 'square';

            return (
              <div
                key={card.id}
                data-slider="card"
                onClick={() => scrollToCard(index)}
                style={{
                  backgroundColor: card.bgColor,
                  color: card.textColor,
                }}
                className={`cursor-pointer rounded-[36px] sm:rounded-[44px] shadow-2xl transition-[filter] duration-200 hover:brightness-[1.02] ${
                  isSquare
                    ? 'w-[26rem] max-w-[88vw] h-[460px] sm:h-[500px] p-8 sm:p-10 flex flex-col justify-between'
                    : 'w-[36rem] md:w-[38rem] max-w-[88vw] h-[460px] sm:h-[500px] p-8 sm:p-10 flex flex-col sm:flex-row gap-6 sm:gap-8 items-stretch'
                }`}
              >
                {/* Square Card (Card 1: Fast Company style) */}
                {isSquare ? (
                  <>
                    <div className="pt-2">
                      <p className="font-editorial text-2xl sm:text-3xl md:text-[34px] font-normal leading-[1.28] tracking-tight text-[#191919]">
                        {card.quote}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 pt-6">
                      <div className="w-13 h-13 rounded-full bg-[#111111] text-white flex items-center justify-center font-serif text-lg font-bold shrink-0 shadow-md">
                        {card.authorBadge}
                      </div>
                      <div>
                        <h4 className="font-bold text-base sm:text-lg text-[#191919] tracking-tight leading-tight">
                          {card.authorName}
                        </h4>
                        <p className="text-xs sm:text-sm text-neutral-600 font-medium mt-0.5">
                          {card.authorRole}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Landscape Cards (Cards 2, 3, 4, 5: Glenn, Elena, Tuhin, Clay) */
                  <>
                    {/* Left Column: Quote & Author Details */}
                    <div className="sm:w-3/5 flex flex-col justify-between h-full space-y-4">
                      <div className="pt-2">
                        <p
                          className={`font-editorial text-xl sm:text-2xl md:text-[27px] font-normal leading-[1.3] tracking-tight ${
                            card.textColor === '#FFFFFF' ? 'text-white' : 'text-[#191919]'
                          }`}
                        >
                          {card.quote}
                        </p>
                      </div>

                      <div className="pt-4">
                        <h4
                          className={`font-bold text-base sm:text-lg tracking-tight leading-tight ${
                            card.textColor === '#FFFFFF' ? 'text-white' : 'text-[#191919]'
                          }`}
                        >
                          {card.authorName}
                        </h4>
                        <p
                          style={{ color: card.subTextColor }}
                          className="text-xs sm:text-sm font-medium mt-0.5"
                        >
                          {card.authorRole}
                        </p>

                        {card.isLink && (
                          <div className="mt-3">
                            <a
                              href="/about"
                              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white hover:underline"
                            >
                              <span>Read case study</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Visual Photo or Stats */}
                    <div className="sm:w-2/5 flex flex-col justify-center">
                      {card.image && (
                        <div className="relative w-full h-[180px] sm:h-full max-h-[360px] rounded-[28px] overflow-hidden shadow-md">
                          <img
                            src={card.image}
                            alt={card.authorName}
                            className="w-full h-full object-cover select-none pointer-events-none"
                          />
                          {card.statNumber && (
                            <div className="absolute bottom-3 right-3 px-3 py-1 bg-black/75 backdrop-blur-md rounded-full text-white text-[11px] font-mono font-bold tracking-wider flex items-center gap-1.5 shadow-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                              <span>{card.statNumber}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {card.statsGrid && (
                        <div className="w-full h-full flex flex-col justify-center space-y-4 p-5 rounded-[28px] bg-black/20 border border-white/10 backdrop-blur-md">
                          {card.statsGrid.map((stat, sIdx) => (
                            <div
                              key={sIdx}
                              className="pb-3 border-b border-white/15 last:border-0 last:pb-0"
                            >
                              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                                {stat.value}
                              </div>
                              <div className="text-xs text-rose-100 font-medium mt-0.5">
                                {stat.label}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* Wispr Flow-style Floating Accent Badge */}
          <div
            ref={badgeRef}
            className="hidden lg:flex absolute bottom-8 right-10 w-22 h-22 rounded-full bg-[#E5E3D8] text-neutral-950 items-center justify-center pointer-events-none select-none z-30 shadow-2xl"
          >
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
              <path
                id="tractionOrbitCirclePath"
                d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
                fill="none"
              />
              <text className="text-[9.5px] font-bold tracking-[0.16em] uppercase fill-neutral-900">
                <textPath href="#tractionOrbitCirclePath" startOffset="0%">
                  • WHY TEAMS CHOOSE • RED APPLE
                </textPath>
              </text>
            </svg>
            <div className="relative z-10 w-7 h-7 rounded-full bg-neutral-900 flex items-center justify-center shadow-xs">
              <TrendingUp className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
