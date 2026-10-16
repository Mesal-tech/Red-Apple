import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

// Official Butter.video Production Assets (High-Res Prismic Images + Cloudinary 60fps MP4 Videos)
// Customized with Red Apple Product Text
const RED_APPLE_DATA = {
  section1: {
    eyebrow: 'THE RED APPLE ECOSYSTEM',
    headline: 'One connected ecosystem designed so African women and clinicians never navigate care alone again.',
    video: 'https://res.cloudinary.com/buttercreatives/video/upload/website/home/story_3/dash_rltoqm.mp4',
    poster: 'https://images.prismic.io/butter/QNh_HKBqzT1AnBom_story-three-media.jpg?auto=format,compress',
    alt: 'Red Apple clinical care and technology platform connecting patients, specialists, and clinics',
  },
  features: [
    {
      id: 'track',
      title: 'Track',
      subtext: 'Log cycles, ovulation windows, and daily symptoms with predictive AI built for African women.',
      video: 'https://res.cloudinary.com/buttercreatives/video/upload/website/home/feature_cards/import_mzb6kv.mp4',
      poster: 'https://images.prismic.io/butter/p5SruxZOCU4DwBbv_home-feature-cards-media-1.jpg?auto=format,compress',
    },
    {
      id: 'consult',
      title: 'Consult',
      subtext: 'Connect with MDCN-licensed OB-GYNs and fertility specialists via secure video within minutes.',
      poster: 'https://images.prismic.io/butter/0WNNkkhILGsOpBUW_home-features-edit-1-.jpg?auto=format,compress',
    },
    {
      id: 'triage',
      title: 'Triage',
      subtext: 'Flag maternal risks early with automated clinical protocols and proactive symptom analysis.',
      poster: 'https://images.prismic.io/butter/vUiREZ54JrqHgkMt_enhance-1-.jpg?auto=format,compress',
    },
    {
      id: 'deliver',
      title: 'Deliver',
      subtext: 'Seamlessly sync patient tracking records directly into clinic EMR workflows and prescription fulfillment.',
      video: 'https://res.cloudinary.com/buttercreatives/video/upload/website/home/feature_cards/ship_zy7btv.mp4',
      poster: 'https://images.prismic.io/butter/it6UwH2L33bJ8Jfa_home-feature-cards-media-4.jpg?auto=format,compress',
    },
  ],
  pillars: [
    {
      id: 'app',
      heading: 'Mobile App',
      subtext: 'Personalized cycle forecasting, ovulation tracking, and culturally sensitive reproductive wellness education built for African women.',
      poster: 'https://images.prismic.io/butter/P8K5Uwru4pdZwAgz_remix-2-.jpg?auto=format,compress',
    },
    {
      id: 'connect',
      heading: 'Connect',
      subtext: 'On-demand, confidential consultations with MDCN-verified OB-GYNs, fertility specialists, and licensed midwives.',
      video: 'https://res.cloudinary.com/buttercreatives/video/upload/website/home/features_highlight/generate_drdhh2.mp4',
      poster: 'https://images.prismic.io/butter/hDrohuQJDf2bxDhq_home-features-highlight-2.jpg?auto=format,compress',
    },
    {
      id: 'os',
      heading: 'Clinic OS',
      subtext: 'Purpose-built electronic medical records and clinical workflow management for maternal hospitals and fertility centers.',
      video: 'https://res.cloudinary.com/buttercreatives/video/upload/website/home/features_highlight/code_gbrdfv.mp4',
      poster: 'https://images.prismic.io/butter/0JUbdPAYldT9Ehje_home-features-highlight-3.jpg?auto=format,compress',
    },
  ],
};

export const ThreePillarsSection: React.FC = () => {
  // --- Section 1: Pinned Horizontal Scroll State & Refs ---
  const mainRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);

  // --- Section 3: Interactive Tabs State & Video Refs ---
  const [activeTab, setActiveTab] = useState<number>(0);
  const [prevTab, setPrevTab] = useState<number>(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const handleTabChange = (index: number) => {
    if (index === activeTab) return;
    setPrevTab(activeTab);
    setActiveTab(index);

    // Play/pause active pillar video
    videoRefs.current.forEach((vid, idx) => {
      if (vid) {
        if (idx === index) {
          vid.currentTime = 0;
          vid.play().catch(() => {});
        } else {
          vid.pause();
        }
      }
    });
  };

  // GSAP Horizontal Scroll Pinning matching Butter's exact StoryThree
  useEffect(() => {
    const mainEl = mainRef.current;
    const innerEl = innerRef.current;
    const pinEl = pinRef.current;

    if (!mainEl || !innerEl || !pinEl) return;

    const mm = gsap.matchMedia();

    mm.add('(min-width: 1024px)', () => {
      const getScrollDistance = () => pinEl.scrollWidth - window.innerWidth;

      const st = gsap.to(pinEl, {
        x: () => -getScrollDistance(),
        ease: 'none',
        duration: 0.5,
        scrollTrigger: {
          trigger: innerEl,
          endTrigger: mainEl,
          pin: innerEl,
          scrub: true,
          start: 'center center',
          end: 'bottom bottom',
          invalidateOnRefresh: true,
          markers: false,
        },
      });

      return () => {
        if (st.scrollTrigger) st.scrollTrigger.kill();
        st.kill();
      };
    });

    return () => mm.revert();
  }, []);

  return (
    <section id="products" className="relative w-full bg-white text-[#0F0F0F] selection:bg-neutral-200">

      {/* ========================================================================= */}
      {/* 1. SECTION 1: "The Red Apple Ecosystem" (GSAP Pinned Horizontal Canvas)   */}
      {/* ========================================================================= */}
      <div
        ref={mainRef}
        className="relative w-full lg:h-[200vh] bg-white overflow-hidden my-16 sm:my-24 lg:my-[180px]"
      >
        <div
          ref={innerRef}
          className="w-full flex items-center will-change-transform relative py-12 lg:py-0"
        >
          <div
            ref={pinRef}
            className="flex flex-col lg:flex-row items-start lg:items-center will-change-transform relative px-6 sm:px-12 lg:px-[160px] w-full lg:w-max gap-10 lg:gap-20"
          >
            {/* Left Column: Eyebrow + Large Editorial Typography */}
            <div className="w-full lg:w-[48vw] shrink-0 space-y-5 sm:space-y-7">
              <p className="font-diatype text-xs sm:text-[13px] uppercase tracking-[0.14em] text-[#0F0F0F]/40 font-medium">
                {RED_APPLE_DATA.section1.eyebrow}
              </p>
              <h2 className="font-diegrotesk font-normal text-4xl sm:text-5xl md:text-6xl lg:text-[68px] leading-[0.94] tracking-[-0.025em] text-[#0F0F0F] max-w-[17ch]">
                {RED_APPLE_DATA.section1.headline}
              </h2>
            </div>

            {/* Right Column: Live High-Def Butter Workspace Video with Retina Poster */}
            <div className="w-full lg:w-auto shrink-0 relative overflow-hidden rounded-[32px] shadow-2xl bg-[#0F0F0F]">
              <video
                src={RED_APPLE_DATA.section1.video}
                poster={RED_APPLE_DATA.section1.poster}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                aria-label={RED_APPLE_DATA.section1.alt}
                className="w-full lg:w-auto h-auto max-w-full lg:max-w-[calc(100vw-160px)] max-h-[85vh] rounded-[32px] object-contain select-none pointer-events-none drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
      </div>


      {/* ========================================================================= */}
      {/* 2. SECTION 2: "Core Capabilities" (The 4 Feature Cards with Live Videos)  */}
      {/* ========================================================================= */}
      <div className="w-full bg-[#FAFAFA] py-24 sm:py-32 md:py-36 px-6 sm:px-12 lg:px-[80px] border-t border-neutral-200/60">
        <div className="max-w-[1600px] mx-auto space-y-12 sm:space-y-16">
          
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <p className="font-diatype text-xs sm:text-[13px] uppercase tracking-[0.14em] text-[#0F0F0F]/40 font-medium">
                Core Capabilities
              </p>
              <h3 className="font-diegrotesk font-normal text-3xl sm:text-5xl md:text-[54px] leading-[0.96] tracking-[-0.02em] text-[#0F0F0F]">
                Your all-in-one reproductive healthcare network.
              </h3>
            </div>

            <a
              href="/about"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-neutral-100 border border-neutral-200/90 text-[#0F0F0F] text-xs sm:text-[13px] font-diatype uppercase tracking-[0.08em] font-medium transition-all self-start md:self-end shadow-xs cursor-pointer group"
            >
              <span>Explore All Solutions</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-7">
            {RED_APPLE_DATA.features.map((feature) => (
              <div key={feature.id} className="flex flex-col group cursor-pointer">
                {/* Media Container with 32px border-radius matching Butter */}
                <div className="w-full aspect-[1/1.3] rounded-[32px] bg-[#0F0F0F] overflow-hidden relative shadow-md">
                  {feature.video ? (
                    <video
                      src={feature.video}
                      poster={feature.poster}
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 select-none pointer-events-none"
                    />
                  ) : (
                    <img
                      src={feature.poster}
                      alt={feature.title}
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 select-none"
                      loading="lazy"
                    />
                  )}
                </div>

                {/* Typography below card */}
                <div className="pt-5 space-y-2">
                  <h4 className="font-diegrotesk font-normal text-2xl sm:text-[26px] text-[#0F0F0F] tracking-[-0.02em]">
                    {feature.title}
                  </h4>
                  <p className="font-diatype text-[15px] leading-relaxed text-[#0F0F0F]/50 max-w-[28ch]">
                    {feature.subtext}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>


      {/* ========================================================================= */}
      {/* 3. SECTION 3: "Connected Care in 3 Pillars" (Mask-Wipe Accordion)         */}
      {/* ========================================================================= */}
      <div className="w-full bg-white py-24 sm:py-32 md:py-36 px-6 sm:px-12 lg:px-[80px] border-t border-neutral-200/60">
        <div className="max-w-[1600px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
            
            {/* Left Column: Mask Wipe Media Stack (Videos + Images) */}
            <div className="lg:col-span-7 order-2 lg:order-1">
              <div className="relative w-full aspect-[1/1.3] sm:aspect-[1/1.1] rounded-[32px] bg-[#0F0F0F] overflow-hidden shadow-2xl">
                {RED_APPLE_DATA.pillars.map((item, idx) => (
                  <div
                    key={item.heading}
                    className="absolute inset-0 w-full h-full overflow-hidden"
                    style={{
                      maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 25%, rgba(0,0,0,0) 75%)',
                      WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 25%, rgba(0,0,0,0) 75%)',
                      maskSize: '400% 100%',
                      WebkitMaskSize: '400% 100%',
                      maskPosition: activeTab === idx ? '100% 0' : '0% 0',
                      WebkitMaskPosition: activeTab === idx ? '100% 0' : '0% 0',
                      maskRepeat: 'no-repeat',
                      WebkitMaskRepeat: 'no-repeat',
                      zIndex: activeTab === idx ? 2 : prevTab === idx ? 1 : 0,
                      transition: activeTab === idx
                        ? 'mask-position 0.6s 0s cubic-bezier(0.835, 0.120, 0.225, 0.770), -webkit-mask-position 0.6s 0s cubic-bezier(0.835, 0.120, 0.225, 0.770)'
                        : 'mask-position 0s 0.6s cubic-bezier(0.835, 0.120, 0.225, 0.770), -webkit-mask-position 0s 0.6s cubic-bezier(0.835, 0.120, 0.225, 0.770)',
                    }}
                  >
                    {item.video ? (
                      <video
                        ref={(el) => { videoRefs.current[idx] = el; }}
                        src={item.video}
                        poster={item.poster}
                        loop
                        muted
                        playsInline
                        preload="auto"
                        className="w-full h-full object-cover select-none pointer-events-none"
                      />
                    ) : (
                      <img
                        src={item.poster}
                        alt={item.heading}
                        className="w-full h-full object-cover select-none"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Accordion Triggers */}
            <div className="lg:col-span-5 order-1 lg:order-2 space-y-6">
              <p className="font-diatype text-xs sm:text-[13px] uppercase tracking-[0.14em] text-[#0F0F0F]/40 font-medium">
                Care in 3 Pillars
              </p>

              <div className="space-y-6 sm:space-y-8 divide-y divide-neutral-200/80">
                {RED_APPLE_DATA.pillars.map((item, idx) => {
                  const isActive = activeTab === idx;
                  return (
                    <div
                      key={item.heading}
                      className="pt-6 first:pt-0 cursor-pointer select-none group"
                      onClick={() => handleTabChange(idx)}
                    >
                      <button
                        type="button"
                        className="w-full text-left focus:outline-hidden cursor-pointer"
                      >
                        <h3
                          className={`font-diegrotesk text-4xl sm:text-5xl md:text-6xl lg:text-[68px] leading-[0.94] tracking-[-0.025em] transition-colors duration-500 ${
                            isActive
                              ? 'text-[#0F0F0F] font-normal'
                              : 'text-[#0F0F0F]/25 group-hover:text-[#0F0F0F]/50 font-normal'
                          }`}
                        >
                          {item.heading}
                        </h3>
                      </button>

                      <div
                        className={`grid transition-all duration-500 ease-out overflow-hidden ${
                          isActive ? 'grid-rows-[1fr] opacity-100 pt-3' : 'grid-rows-[0fr] opacity-0'
                        }`}
                      >
                        <p className="overflow-hidden font-diatype text-base sm:text-lg text-[#0F0F0F]/60 font-normal leading-relaxed max-w-[34ch]">
                          {item.subtext}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>

    </section>
  );
};
