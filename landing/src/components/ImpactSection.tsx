import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const ImpactSection: React.FC = () => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const maskRef = useRef<HTMLDivElement>(null);
  const stage1Ref = useRef<HTMLDivElement>(null);
  const stage2Ref = useRef<HTMLDivElement>(null);

  // Video refs for Stage 1 (rural mother/daughter portrait footage)
  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);
  const videoSpotlightRef = useRef<HTMLVideoElement>(null);

  // Video refs for Stage 2 (aerial city infrastructure footage)
  const aerialVideoRef = useRef<HTMLVideoElement>(null);
  const aerialSpotlightRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let animId: number;
    let target1X = 50, target1Y = 50, cur1X = 50, cur1Y = 50;
    let target2X = 50, target2Y = 50, cur2X = 50, cur2Y = 50;

    const updateMouse = () => {
      cur1X += (target1X - cur1X) * 0.08;
      cur1Y += (target1Y - cur1Y) * 0.08;
      cur2X += (target2X - cur2X) * 0.08;
      cur2Y += (target2Y - cur2Y) * 0.08;

      if (stage1Ref.current) {
        stage1Ref.current.style.setProperty('--mouse-x', `${cur1X.toFixed(2)}%`);
        stage1Ref.current.style.setProperty('--mouse-y', `${cur1Y.toFixed(2)}%`);
      }
      if (stage2Ref.current) {
        stage2Ref.current.style.setProperty('--mouse-x', `${cur2X.toFixed(2)}%`);
        stage2Ref.current.style.setProperty('--mouse-y', `${cur2Y.toFixed(2)}%`);
      }

      animId = requestAnimationFrame(updateMouse);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (stage1Ref.current) {
        const r1 = stage1Ref.current.getBoundingClientRect();
        target1X = Math.max(10, Math.min(90, ((e.clientX - r1.left) / r1.width) * 100));
        // Keep spotlight safely away from the bottom joint (max 72%)
        target1Y = Math.max(12, Math.min(72, ((e.clientY - r1.top) / r1.height) * 100));
      }
      if (stage2Ref.current) {
        const r2 = stage2Ref.current.getBoundingClientRect();
        target2X = Math.max(10, Math.min(90, ((e.clientX - r2.left) / r2.width) * 100));
        // Keep spotlight safely away from the top joint (min 28%)
        target2Y = Math.max(28, Math.min(85, ((e.clientY - r2.top) / r2.height) * 100));
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    animId = requestAnimationFrame(updateMouse);

    // Synchronize and autoplay all background video layers
    const allVideos = [
      video1Ref.current,
      video2Ref.current,
      videoSpotlightRef.current,
      aerialVideoRef.current,
      aerialSpotlightRef.current,
    ];
    allVideos.forEach((v) => {
      if (v) {
        v.play().catch(() => { });
      }
    });

    // Scroll-driven masking effect: Masks out the sides to reveal a central 50% window, then expands to 100% before fully entering
    const wrapper = wrapperRef.current;
    const mask = maskRef.current;
    let mm: gsap.MatchMedia | null = null;

    if (wrapper && mask) {
      mm = gsap.matchMedia();

      mm.add('(min-width: 768px)', () => {
        // Desktop / Tablet: Hides 25% left and 25% right (central 50% visible) with 32px rounded corners
        const tween = gsap.fromTo(
          mask,
          {
            clipPath: 'inset(0% 25% 0% 25% round 32px)',
          },
          {
            clipPath: 'inset(0% 0% 0% 0% round 0px)',
            ease: 'none',
            scrollTrigger: {
              trigger: wrapper,
              start: 'top bottom',
              end: 'top 12%',
              scrub: 0.5,
              invalidateOnRefresh: true,
            },
          }
        );

        return () => {
          if (tween.scrollTrigger) tween.scrollTrigger.kill();
          tween.kill();
        };
      });

      mm.add('(max-width: 767px)', () => {
        // Mobile: Hides 10% on each side (80% visible) with 20px rounded corners
        const tween = gsap.fromTo(
          mask,
          {
            clipPath: 'inset(0% 10% 0% 10% round 20px)',
          },
          {
            clipPath: 'inset(0% 0% 0% 0% round 0px)',
            ease: 'none',
            scrollTrigger: {
              trigger: wrapper,
              start: 'top bottom',
              end: 'top 10%',
              scrub: 0.5,
              invalidateOnRefresh: true,
            },
          }
        );

        return () => {
          if (tween.scrollTrigger) tween.scrollTrigger.kill();
          tween.kill();
        };
      });
    }

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      if (mm) mm.revert();
    };
  }, []);

  return (
    <section
      id="impact"
      ref={wrapperRef}
      className="relative w-full bg-white select-none overflow-hidden"
    >
      <div
        ref={maskRef}
        data-nav-theme="dark"
        className="relative w-full bg-black text-white overflow-hidden will-change-[clip-path]"
        style={{
          clipPath: 'inset(0% 25% 0% 25% round 32px)',
          WebkitClipPath: 'inset(0% 25% 0% 25% round 32px)',
        }}
      >
        {/* ========================================================================= */}
        {/* BEAT 1: The Crisis & Generational Mission (Mother & Daughter Portrait)   */}
        {/* ========================================================================= */}
        <div
          ref={stage1Ref}
          className="relative w-full min-h-screen bg-black text-white flex flex-col justify-between items-start px-6 sm:px-12 lg:px-20 py-16 sm:py-24 overflow-hidden"
          style={{
            '--mouse-x': '50%',
            '--mouse-y': '50%',
          } as React.CSSProperties}
        >
        {/* Full-bleed masked background video */}
        <div className="absolute inset-0 w-full h-full bg-black pointer-events-none overflow-hidden z-0">
          {/* Patch 1: Upper-left aperture */}
          <div
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{
              maskImage:
                'radial-gradient(ellipse 38% 46% at 26% 32%, black 18%, rgba(0,0,0,0.6) 44%, transparent 72%)',
              WebkitMaskImage:
                'radial-gradient(ellipse 38% 46% at 26% 32%, black 18%, rgba(0,0,0,0.6) 44%, transparent 72%)',
            }}
          >
            <img
              src="/images/video1_frame0.jpg"
              alt=""
              className="absolute inset-0 w-full h-full object-cover scale-[1.3] origin-center grayscale contrast-125 brightness-90 pointer-events-none"
            />
            <video
              ref={video1Ref}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover scale-[1.3] origin-center grayscale contrast-125 brightness-90 pointer-events-none"
            >
              <source src="/Cinematic_documentary_slow_mot.mp4" type="video/mp4" />
            </video>
          </div>

          {/* Patch 2: Right aperture */}
          <div
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{
              maskImage:
                'radial-gradient(ellipse 36% 48% at 78% 38%, black 20%, rgba(0,0,0,0.6) 46%, transparent 72%)',
              WebkitMaskImage:
                'radial-gradient(ellipse 36% 48% at 78% 38%, black 20%, rgba(0,0,0,0.6) 46%, transparent 72%)',
            }}
          >
            <img
              src="/images/video1_frame0.jpg"
              alt=""
              className="absolute inset-0 w-full h-full object-cover scale-[1.3] origin-center grayscale contrast-125 brightness-90 pointer-events-none"
            />
            <video
              ref={video2Ref}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover scale-[1.3] origin-center grayscale contrast-125 brightness-90 pointer-events-none"
            >
              <source src="/Cinematic_documentary_slow_mot.mp4" type="video/mp4" />
            </video>
          </div>

          {/* Patch 3: Mouse spotlight */}
          <div
            className="hidden md:block absolute inset-0 w-full h-full pointer-events-none"
            style={{
              maskImage:
                'radial-gradient(circle 220px at var(--mouse-x, 50%) var(--mouse-y, 50%), black 15%, transparent 68%)',
              WebkitMaskImage:
                'radial-gradient(circle 220px at var(--mouse-x, 50%) var(--mouse-y, 50%), black 15%, transparent 68%)',
            }}
          >
            <img
              src="/images/video1_frame0.jpg"
              alt=""
              className="absolute inset-0 w-full h-full object-cover scale-[1.3] origin-center grayscale contrast-125 brightness-90 pointer-events-none"
            />
            <video
              ref={videoSpotlightRef}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover scale-[1.3] origin-center grayscale contrast-125 brightness-90 pointer-events-none"
            >
              <source src="/Cinematic_documentary_slow_mot.mp4" type="video/mp4" />
            </video>
          </div>

          {/* Edge Vignette */}
          <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black pointer-events-none opacity-60" />

          {/* Guaranteed Solid Black Joint Buffer at bottom of Stage 1 */}
          <div className="absolute bottom-0 inset-x-0 h-48 sm:h-64 bg-gradient-to-t from-black via-black/95 to-transparent pointer-events-none z-10" />
        </div>

        {/* Top-Left: Problem Statement */}
        <div className="w-full max-w-2xl text-left space-y-1 sm:space-y-1.5 relative z-20 shrink-0 pt-4 sm:pt-8">
          <p className="font-editorial italic text-xs sm:text-sm md:text-base text-neutral-400 tracking-tight">
            The Reality We Refuse to Accept
          </p>

          <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight text-white leading-tight">
            <span className="block font-sans font-extrabold text-white">
              AFRICA'S REPRODUCTIVE CRISIS
            </span>
            <span className="block font-editorial font-normal italic text-neutral-300 mt-0.5">
              DEMANDS PREVENTIVE ACTION
            </span>
          </h2>
        </div>

        {/* Bottom-Right: Resolution & Outcome */}
        <div className="w-full max-w-xl self-end text-left md:text-right space-y-1 sm:space-y-1.5 relative z-20 shrink-0 pb-4 sm:pb-8 mt-auto">
          <p className="font-editorial italic text-xs sm:text-sm md:text-base text-neutral-400 tracking-tight">
            The Future We Are Creating
          </p>

          <h3 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight text-white leading-tight">
            <span className="block font-sans font-extrabold text-white">
              WHERE MOTHERS &amp; DAUGHTERS
            </span>
            <span className="block font-editorial font-normal italic text-neutral-300 mt-0.5">
              THRIVE ACROSS GENERATIONS
            </span>
          </h3>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BEAT 2: The Healthcare Access Deficit (Aerial City Footage & Perimeter Patches) */}
      {/* ========================================================================= */}
      <div
        ref={stage2Ref}
        className="relative w-full min-h-screen bg-black text-white flex flex-col justify-center items-center px-4 sm:px-8 lg:px-12 pt-28 sm:pt-36 lg:pt-40 pb-16 sm:pb-24 overflow-hidden"
        style={{
          '--mouse-x': '50%',
          '--mouse-y': '50%',
        } as React.CSSProperties}
      >
        {/* Full-bleed masked aerial background with peripheral apertures */}
        <div className="absolute inset-0 w-full h-full bg-black pointer-events-none overflow-hidden z-0">
          {/* Peripheral circular patches revealing the aerial city lights */}
          <div
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{
              maskImage:
                'radial-gradient(circle 160px at 15% 26%, black 20%, rgba(0,0,0,0.6) 45%, transparent 72%), radial-gradient(circle 180px at 10% 54%, black 20%, rgba(0,0,0,0.6) 45%, transparent 72%), radial-gradient(circle 160px at 24% 78%, black 20%, rgba(0,0,0,0.6) 45%, transparent 72%), radial-gradient(circle 160px at 85% 25%, black 20%, rgba(0,0,0,0.6) 45%, transparent 72%), radial-gradient(circle 190px at 90% 52%, black 20%, rgba(0,0,0,0.6) 45%, transparent 72%), radial-gradient(circle 170px at 74% 78%, black 20%, rgba(0,0,0,0.6) 45%, transparent 72%)',
              WebkitMaskImage:
                'radial-gradient(circle 160px at 15% 26%, black 20%, rgba(0,0,0,0.6) 45%, transparent 72%), radial-gradient(circle 180px at 10% 54%, black 20%, rgba(0,0,0,0.6) 45%, transparent 72%), radial-gradient(circle 160px at 24% 78%, black 20%, rgba(0,0,0,0.6) 45%, transparent 72%), radial-gradient(circle 160px at 85% 25%, black 20%, rgba(0,0,0,0.6) 45%, transparent 72%), radial-gradient(circle 190px at 90% 52%, black 20%, rgba(0,0,0,0.6) 45%, transparent 72%), radial-gradient(circle 170px at 74% 78%, black 20%, rgba(0,0,0,0.6) 45%, transparent 72%)',
              WebkitMaskComposite: 'source-over',
              maskComposite: 'add',
            }}
          >
            <img
              src="/images/video2_frame0.jpg"
              alt=""
              className="absolute inset-0 w-full h-full object-cover scale-[1.3] origin-center grayscale contrast-125 brightness-85 pointer-events-none"
            />
            <video
              ref={aerialVideoRef}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover scale-[1.3] origin-center grayscale contrast-125 brightness-85 pointer-events-none"
            >
              <source src="/Cinematic_documentary_aerial_d.mp4" type="video/mp4" />
            </video>
          </div>

          {/* Interactive Mouse Spotlight on aerial footage */}
          <div
            className="hidden md:block absolute inset-0 w-full h-full pointer-events-none"
            style={{
              maskImage:
                'radial-gradient(circle 220px at var(--mouse-x, 50%) var(--mouse-y, 50%), black 15%, transparent 68%)',
              WebkitMaskImage:
                'radial-gradient(circle 220px at var(--mouse-x, 50%) var(--mouse-y, 50%), black 15%, transparent 68%)',
            }}
          >
            <img
              src="/images/video2_frame0.jpg"
              alt=""
              className="absolute inset-0 w-full h-full object-cover scale-[1.3] origin-center grayscale contrast-125 brightness-85 pointer-events-none"
            />
            <video
              ref={aerialSpotlightRef}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover scale-[1.3] origin-center grayscale contrast-125 brightness-85 pointer-events-none"
            >
              <source src="/Cinematic_documentary_aerial_d.mp4" type="video/mp4" />
            </video>
          </div>

          {/* Vignette */}
          <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black pointer-events-none opacity-60" />

          {/* Guaranteed Solid Black Joint Buffer at top of Stage 2 (completely covers the seam) */}
          <div className="absolute top-0 inset-x-0 h-48 sm:h-64 bg-gradient-to-b from-black via-black/95 to-transparent pointer-events-none z-10" />

          {/* Solid Black Buffer at bottom of Stage 2 */}
          <div className="absolute bottom-0 inset-x-0 h-36 sm:h-48 bg-gradient-to-t from-black via-black/95 to-transparent pointer-events-none z-10" />
        </div>

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4 relative z-20 shrink-0 my-auto">
          <h2 className="text-xl sm:text-xl md:text-2xl lg:text-3xl font-black uppercase tracking-tight text-white leading-tight">
            <span className="block font-sans font-extrabold text-white">
              BY GUIDING & EMPOWERING WOMEN THROUGH
            </span>
            <span className="block font-editorial font-normal italic text-neutral-300 mt-0.5">
              EVERY STEP OF THEIR HEALTH & WELLNESS JOURNEY
            </span>
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-neutral-300 font-sans font-normal leading-relaxed max-w-2xl mx-auto tracking-wide">
            We bridge the gap between silent struggles and timely medical intervention. By uniting everyday reproductive tracking, AI-powered early triage, and 24/7 access to licensed specialists, we ensure every woman receives proactive care, confidential support, and lasting dignity—long before emergencies arise.
          </p>
        </div>
      </div>
      {/* End of expandRef */}
      </div>
    </section>
  );
};


