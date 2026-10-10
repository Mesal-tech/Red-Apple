import React, { useEffect, useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import {
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Heart
} from 'lucide-react';

interface ContactPageProps {
  onNavigate?: (page: string) => void;
}

export const ContactPage: React.FC<ContactPageProps> = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const faqs = [
    {
      q: 'How does an encrypted video consultation work on Red Apple Connect?',
      a: 'You can book an appointment directly through our app or web portal. You will be matched with a certified Nigerian or Ghanaian OB-GYN based on your clinical needs. Consultations are end-to-end encrypted, optimized for mobile 3G/4G bandwidth, and electronic prescriptions are sent directly to licensed local pharmacies.',
    },
    {
      q: 'Is my reproductive cycle and medical history strictly confidential?',
      a: 'Yes. Red Apple implements zero-knowledge client-side encryption. We strictly adhere to the Nigeria Data Protection Act (NDPA 2023) and international medical privacy standards. Your cycle logs and consultation notes are never shared with or sold to third-party ad networks.',
    },
    {
      q: 'How can our maternity clinic or hospital join the Red Apple OS network?',
      a: 'Private maternity clinics, fertility centers, and antenatal clinics can request an onboarding demo below. Our clinical operations team visits your facility in Lagos, Abuja, or Accra to train staff, digitize records, and integrate real-time ultrasound scan telemetry.',
    },
    {
      q: 'What regions are currently covered by the specialist doctor network?',
      a: 'Our specialist telemedicine network currently covers patients across Nigeria and Ghana, with direct clinical partner referrals operating in major urban and peri-urban hubs.',
    },
  ];

  return (
    <div className="w-full min-h-screen bg-white text-neutral-900 font-sans selection:bg-red-100 overflow-x-hidden">

      {/* 1. Global Floating Navbar */}
      <Navbar brandName="RED APPLE" activePage="contact" />

      {/* 2. Hero Section: Split Screen Matching Extrafazant Reference Screenshot */}
      <section className="relative w-full lg:h-screen lg:min-h-[600px] lg:max-h-[900px] bg-white flex flex-col lg:flex-row items-stretch border-b border-neutral-200 overflow-hidden">

        {/* LEFT COLUMN: Stacked Big Editorial Typography & CTA Buttons */}
        <div className="w-full lg:w-1/2 pt-24 sm:pt-28 lg:pt-24 pb-12 sm:pb-16 px-6 sm:px-10 md:px-12 lg:px-14 xl:px-16 flex flex-col justify-center relative z-10 h-full">

          <div className="max-w-md xl:max-w-lg space-y-4 sm:space-y-5 my-auto">

            {/* Eyebrow Label */}
            <div>
              <span className="font-editorial italic text-sm sm:text-base text-neutral-500 font-normal tracking-tight">
                Contact
              </span>
            </div>

            {/* Stacked Typographic Headline Perfectly Scaled */}
            <h1 className="text-3xl sm:text-4xl md:text-[44px] lg:text-[46px] xl:text-[52px] font-black uppercase text-neutral-950 leading-[0.94] select-none tracking-tight">
              <span className="block font-sans font-black tracking-tight">WANT TO SET</span>
              <span className="block font-sans font-black tracking-tight">SOMETHING</span>
              <span className="block font-sans font-black tracking-tight">IN</span>
              <span className="block font-editorial font-normal tracking-tight">MOTION</span>
              <span className="block font-editorial font-normal tracking-tight">TOO?</span>
            </h1>

            {/* Subtext Paragraph */}
            <div className="space-y-0.5 pt-1">
              <p className="font-editorial text-base sm:text-lg md:text-xl text-neutral-900 font-normal leading-snug">
                Tell us what is on your mind.
              </p>
              <p className="font-editorial text-base sm:text-lg md:text-xl text-neutral-900 font-normal leading-snug">
                We make dignified healthcare happen.
              </p>
            </div>

            {/* Two Action Buttons: Hot Pink (CALL US) & Electric Blue (EMAIL US) */}
            <div className="pt-2 flex flex-wrap items-center gap-2.5">

              {/* Call Us Button */}
              <a
                href="tel:+2348007332775"
                className="inline-flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 bg-[#FF4D8D] hover:bg-[#E63975] text-white font-sans font-black text-xs uppercase tracking-wider transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer hover:-translate-y-0.5 rounded-none"
              >
                <Phone className="w-3.5 h-3.5 fill-white" />
                <span>CALL US</span>
              </a>

              {/* Email Us Button */}
              <a
                href="mailto:care@redapple.africa"
                className="inline-flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 bg-[#C81E3A] hover:bg-[#002ED6] text-white font-sans font-black text-xs uppercase tracking-wider transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer hover:-translate-y-0.5 rounded-none"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>EMAIL US</span>
              </a>

            </div>

          </div>

          {/* Die-cut Tilted Sticker Overlapping Split Border (Properly Scaled) */}
          <div className="hidden lg:block absolute top-[28%] -right-7 xl:-right-9 z-30 transform rotate-12 hover:rotate-6 transition-transform pointer-events-none select-none">
            <div
              style={{ fontFamily: 'var(--font-bubble, "DynaPuff", cursive, sans-serif)' }}
              className="px-3 py-1.5 bg-[#C81E3A] text-[#FACC15] font-black text-[11px] sm:text-xs uppercase tracking-wider rounded-lg border-2 border-white shadow-xl drop-shadow-[0_8px_16px_rgba(0,0,0,0.2)] flex items-center gap-1"
            >
              <span>WE ARE LISTENING</span>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Full-Bleed Candid Documentary Clinic Photo */}
        <div className="w-full lg:w-1/2 relative h-[380px] sm:h-[460px] lg:h-full overflow-hidden bg-neutral-100 border-t lg:border-t-0 lg:border-l border-neutral-200">
          {/* Blank Placeholder */}
          <div className="w-full h-full bg-neutral-100" />

          {/* Floating Sticker Accents on Photo (Properly Scaled) */}

          {/* Circular Stamp Sticker */}
          <div className="absolute top-20 right-6 hidden sm:block transform -rotate-6 hover:rotate-0 transition-transform pointer-events-none select-none">
            <div className="w-16 h-16 rounded-full border-2 border-white/90 bg-white/95 backdrop-blur-md p-1 flex flex-col items-center justify-center text-center shadow-lg">
              <Sparkles className="w-3 h-3 text-crimson mb-0.5" />
              <span className="text-[7.5px] font-mono font-bold text-neutral-900 uppercase leading-none">
                THIS IS HOW
              </span>
              <span className="text-[7.5px] font-mono font-bold text-[#C81E3A] uppercase leading-none mt-0.5">
                WE CARE
              </span>
            </div>
          </div>

          {/* Slanted Die-Cut Badge */}
          <div className="absolute top-[42%] right-6 sm:right-10 transform -rotate-12 hover:rotate-0 transition-transform pointer-events-none select-none">
            <div className="px-3 py-1 bg-[#C81E3A] text-white font-black text-[11px] uppercase tracking-wider border-2 border-white shadow-lg flex items-center gap-1 rounded-none">
              <Heart className="w-3 h-3 fill-white" />
              <span>DIGNIFIED CARE!</span>
            </div>
          </div>

          {/* Polaroid Taped Label at Bottom */}
          <div className="absolute bottom-5 left-5 right-5 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-neutral-200 shadow-lg flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-neutral-900 uppercase tracking-tight text-[11px]">
                VICTORIA ISLAND CLINICAL HUB
              </span>
            </div>
            <span className="font-mono text-[10px] text-neutral-500 font-semibold">
              09:30 AM • LIVE TRIAGE
            </span>
          </div>

        </div>

      </section>

      {/* 4. Frequently Asked Questions Accordion */}
      <section className="relative w-full py-20 sm:py-28 px-6 sm:px-10 md:px-14 lg:px-20 bg-white">
        <div className="max-w-4xl mx-auto space-y-10">

          <div className="text-center space-y-2">
            <span className="font-editorial italic text-base sm:text-lg text-neutral-500">
              Clear Answers
            </span>
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-neutral-950">
              FREQUENTLY ASKED QUESTIONS
            </h3>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border-2 border-neutral-200/80 overflow-hidden transition-all shadow-xs"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-neutral-50 transition-colors"
                  >
                    <span className="font-editorial text-lg sm:text-xl text-neutral-950 font-normal">
                      {faq.q}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-5 sm:px-6 pb-6 pt-1 text-xs sm:text-sm text-neutral-600 leading-relaxed font-normal border-t border-neutral-100">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 6. Global Footer */}
      <Footer />

    </div>
  );
};
