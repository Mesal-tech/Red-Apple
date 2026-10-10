import React, { useEffect, useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { KineticHeroText } from '../components/KineticHeroText';
import {
  ArrowDown,
  ArrowRight,
  Calendar,
  Clock,
  Download,
  Mail,
  X,
  BookOpen,
  Share2,
  Check
} from 'lucide-react';

interface NewsroomPageProps {
  onNavigate?: (page: string) => void;
}

interface NewsItem {
  id: string;
  title: string;
  category: 'Milestones' | 'Product & SaaS' | 'Clinical Research' | 'Community Impact';
  date: string;
  readTime: string;
  sticker: string;
  summary: string;
  image: string;
  imageAlt: string;
  author: string;
  authorRole: string;
  fullBody?: string[];
  takeaways?: string[];
}

export const NewsroomPage: React.FC<NewsroomPageProps> = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeArticleModal, setActiveArticleModal] = useState<NewsItem | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const scrollToDispatches = () => {
    const el = document.getElementById('dispatches');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const articles: NewsItem[] = [
    {
      id: 'news-1',
      title: 'Red Apple Connect Crosses 15,000 Live Virtual OB-GYN Consultations Across West Africa',
      category: 'Milestones',
      date: 'September 28, 2026',
      readTime: '4 min read',
      sticker: 'TELEHEALTH MILESTONE',
      summary: 'Reaching women across Nigeria and Ghana, Red Apple has lowered average specialist wait times from weeks to under two hours through encrypted telehealth video consultations.',
      image: '/images/pillar-connect.jpg',
      imageAlt: 'Doctor reviewing virtual patient consultation',
      author: 'Clinical Communications Desk',
      authorRole: 'Red Apple Medical Ops, Victoria Island Lagos',
      takeaways: [
        'Average consultation wait time dropped from 14 days in regional teaching hospitals to 1.8 hours on Red Apple Connect.',
        'Over 91% of triage escalations resolved without requiring costly inter-state emergency hospital transfers.',
        'Client-side end-to-end encryption compliant with NDPA data privacy regulations for all medical records.',
      ],
      fullBody: [
        'In primary healthcare across West Africa, the specialist-to-patient ratio for obstetricians remains critical — frequently fewer than 1 OB-GYN for every 10,000 pregnant women in peri-urban areas.',
        'Red Apple Connect was engineered to bridge this physical chasm. By deploying low-bandwidth video telemetry and integrated ultrasound review pipelines, pregnant mothers can connect directly to vetted specialists right from their smartphones or local community health posts.',
        'Reaching 15,000 completed consultations demonstrates that digital health in Africa succeeds when built around local clinical workflows rather than imported Western assumptions.',
      ],
    },
    {
      id: 'news-2',
      title: 'Partnering with 45 Maternal Healthcare Clinics to Digitize Antenatal Health Records',
      category: 'Product & SaaS',
      date: 'August 14, 2026',
      readTime: '5 min read',
      sticker: 'CLINIC SAAS',
      summary: 'Red Apple OS rolls out across primary maternal centers in Lagos and Accra, eliminating lost paper folders and integrating real-time ultrasound scan telemetry.',
      image: '/images/clinical-care.jpg',
      imageAlt: 'Midwife and doctor collaborating with tablet in clinic',
      author: 'Health Systems Team',
      authorRole: 'Clinic Partner Operations, Accra Hub',
      takeaways: [
        'Paper records replaced with offline-first tablet interfaces resilient to clinic power and network outages.',
        'Automated WHO maternal danger sign alerts triggered during routine blood pressure and glucose inputs.',
        'Direct synchronization between hospital ultrasound kits and patients’ personal mobile health records.',
      ],
      fullBody: [
        'Paper-based medical record loss accounts for up to 30% of repeated, unnecessary prenatal lab tests across community healthcare facilities in Sub-Saharan Africa.',
        'Red Apple OS provides a streamlined, lightweight clinic operating system tailored specifically for maternal wards. Nurses and midwives input vital signs in seconds, while the system automatically flags gestational hypertension or early preeclampsia risks.',
        'Over the next two quarters, our team will expand the rollout to 100 additional private and mission hospitals across southwestern Nigeria and Greater Accra.',
      ],
    },
    {
      id: 'news-3',
      title: 'Clinical Whitepaper: Localized Ovulation & Fertile Window Algorithms for African Women',
      category: 'Clinical Research',
      date: 'July 05, 2026',
      readTime: '8 min read',
      sticker: 'PEER-REVIEWED',
      summary: 'Our medical advisory board publishes research analyzing variable menstrual cycle patterns, maternal nutrition, and symptom logs across Sub-Saharan urban demographics.',
      image: '/images/pillar-app.jpg',
      imageAlt: 'Red Apple mobile cycle intelligence interface',
      author: 'Dr. Folashade Adeleke, FWACS',
      authorRole: 'Senior Clinical Advisor, OB-GYN',
      takeaways: [
        'Standard algorithmic models trained on Western datasets mispredict fertile windows for up to 34% of West African cycles.',
        'Nutritional variations and environmental stressors directly impact luteal phase lengths in equatorial climates.',
        'Red Apple’s adaptive Bayesian cycle model improves prediction accuracy by 41% after 3 logged cycles.',
      ],
      fullBody: [
        'Most commercial femtech applications rely on predictive models calibrated against North American or European cohort populations. These algorithms frequently fail to account for distinct epidemiological and dietary realities in Africa.',
        'Our latest clinical whitepaper, compiled by maternal health researchers across the University of Nigeria and Korle-Bu Teaching Hospital, introduces an adaptive cycle tracking methodology tailored to African women.',
        'The algorithm factors in locally prevalent hormonal markers, body temperature variances, and clinical symptom clusters to deliver reproductive dignity and actionable fertility intelligence.',
      ],
    },
    {
      id: 'news-4',
      title: 'Community Midwifery & Maternal Literacy: Empowering Expectant Mothers in Peri-Urban Centers',
      category: 'Community Impact',
      date: 'May 22, 2026',
      readTime: '6 min read',
      sticker: 'GRASSROOTS',
      summary: 'Hands-on clinical workshops equip midwives with digital tablet trackers, improving prenatal attendance and timely gestational danger sign triage.',
      image: '/images/community-outreach.jpg',
      imageAlt: 'Community midwife training session with mothers',
      author: 'Amina Bello, RN, RM, MPH',
      authorRole: 'Head of Midwifery & Community Health',
      takeaways: [
        'Over 600 grassroots midwives trained in early gestational ultrasound screening and telehealth escalation.',
        'Prenatal care adherence increased from 52% to 84% among participating mothers in peri-urban communities.',
        'Culturally contextual audio guides distributed in Yoruba, Hausa, Igbo, and Twi to eliminate literacy barriers.',
      ],
      fullBody: [
        'Maternal mortality cannot be tackled purely through algorithms in a server room; it requires empowering the heroic midwives who stand on the frontline every day.',
        'Through our community outreach program, Red Apple delivers ruggedized portable ultrasound probes and solar-backed tablet kits to peri-urban clinics.',
        'Midwives can perform rapid bedside triage, detect ectopic pregnancies weeks earlier, and connect mothers directly with emergency surgical teams when complications arise.',
      ],
    },
  ];

  const categories = ['All', 'Milestones', 'Product & SaaS', 'Clinical Research', 'Community Impact'];

  const filteredArticles = selectedCategory === 'All'
    ? articles
    : articles.filter((a) => a.category === selectedCategory);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="w-full min-h-screen bg-white text-neutral-900 font-sans selection:bg-red-100 overflow-x-hidden">

      {/* 1. Global Floating Navbar with active squiggly indicator */}
      <Navbar brandName="RED APPLE" activePage="newsroom" />

      {/* 2. Hero Section: Exactly matching Extrafazant ("Newsroom & Dispatches" / "VOICES OF IMPACT" / Manifesto / Squiggly CTA) */}
      <header className="relative w-full pt-28 sm:pt-36 md:pt-42 pb-16 sm:pb-24 px-6 sm:px-10 lg:px-14 bg-white">
        <div className="max-w-6xl mx-auto text-center space-y-5 sm:space-y-6 relative z-10">

          {/* Top Label in elegant serif italic */}
          <div className="flex items-center justify-center">
            <span className="font-editorial italic text-base sm:text-lg md:text-xl text-neutral-500 font-normal tracking-tight">
              Newsroom &amp; Dispatches
            </span>
          </div>

          {/* Main Headline with GSAP Kinetic Variable Font Weight Hover Effect */}
          <div className="flex justify-center w-full">
            <KineticHeroText
              line2Sans="VOICES OF"
              line2Serif="IMPACT"
              fontSizeClass="text-4xl sm:text-6xl md:text-7xl lg:text-[80px]"
              className="text-center"
            />
          </div>

          {/* Centered Editorial Manifesto Paragraph */}
          <div className="max-w-2xl mx-auto pt-1">
            <p className="font-sans text-base sm:text-lg md:text-xl text-neutral-700 leading-relaxed font-normal">
              Field updates, clinical whitepapers, and operational dispatches from midwives, OB-GYNs, and health workers redefining maternal and reproductive health across West Africa.
            </p>
          </div>

          {/* CTA Link with Extrafazant signature Hand-Drawn Wavy Blue Squiggly Underline */}
          <div className="pt-2 flex justify-center">
            <button
              onClick={scrollToDispatches}
              className="group inline-flex flex-col items-center gap-1.5 cursor-pointer select-none focus:outline-hidden"
              aria-label="Read latest dispatches"
            >
              <div className="inline-flex items-center gap-2.5 text-sm sm:text-base font-bold text-neutral-900 group-hover:text-[#C81E3A] transition-colors">
                <span>Read latest dispatches</span>
                <span className="w-5 h-5 rounded-xs bg-[#C81E3A] text-white flex items-center justify-center transition-transform duration-200 group-hover:translate-y-1">
                  <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
                </span>
              </div>
              {/* Hand-drawn squiggly blue wave SVG */}
              <svg
                className="w-40 sm:w-44 h-2 text-[#C81E3A] -mt-0.5 overflow-visible"
                viewBox="0 0 160 8"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2 4.5C8 1 14 7 20 4.5C26 2 32 7 38 4.5C44 2 50 7 56 4.5C62 2 68 7 74 4.5C80 2 86 7 92 4.5C98 2 104 7 110 4.5C116 2 122 7 128 4.5C134 2 140 7 146 4.5C152 2 156 5.5 158 4.5"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

        </div>
      </header>

      {/* 3. Featured Lead Story (Tactile Magazine Feature) */}
      <section className="relative w-full py-16 sm:py-20 px-6 sm:px-10 lg:px-14 bg-neutral-50/70 border-t border-b border-neutral-200/80">
        <div className="max-w-6xl mx-auto">

          <div className="bg-white rounded-3xl border-2 border-neutral-200/80 p-8 sm:p-12 shadow-lg hover:shadow-2xl transition-all duration-300 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">

            {/* Left Content */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="bg-red-50 text-crimson font-mono text-[10px] font-bold px-3 py-1 rounded-full border border-red-200">
                  FEATURED DISPATCH • OCTOBER 2026
                </span>
                <span className="text-neutral-500 font-mono text-[11px] flex items-center gap-1 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>5 min read</span>
                </span>
              </div>

              <h2 className="font-editorial text-2xl sm:text-3xl md:text-4xl text-neutral-950 font-normal leading-tight">
                Bridging the Antenatal Diagnostic Divide: How Red Apple Revolutionizes Clinic-to-Home Maternal Care
              </h2>

              <p className="font-sans text-sm sm:text-base text-neutral-600 leading-relaxed font-normal">
                A deep dive into our tri-part clinical architecture linking consumer menstrual tracking, telemedicine OB-GYN consultations, and physical hospital records into one unified continuum of care.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <button
                  onClick={() => setActiveArticleModal(articles[0])}
                  className="px-6 py-3 rounded-full bg-crimson text-white text-xs font-bold uppercase tracking-wider hover:bg-crimson-dark transition-all duration-200 shadow-md shadow-crimson/20 flex items-center gap-2 cursor-pointer hover:-translate-y-0.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Read Full Article</span>
                </button>

                <span className="text-xs font-editorial italic text-neutral-500">
                  By Dr. Folashade Adeleke &amp; Clinical Advisory Team
                </span>
              </div>
            </div>

            {/* Right Photo with Polaroid Tape Label */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden border-2 border-neutral-200 shadow-md aspect-[4/3] bg-neutral-100 group">
                {/* Blank Placeholder */}
                <div className="w-full h-full bg-neutral-100" />
                {/* Polaroid taped label */}
                <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-neutral-200 text-[11px] font-mono text-neutral-700 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>LAGOS CLINIC HUB</span>
                  </div>
                  <span className="text-neutral-400">09:30 AM</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 4. Articles Feed Section */}
      <section id="dispatches" className="relative w-full py-20 sm:py-28 px-6 sm:px-10 lg:px-14 bg-white">
        <div className="max-w-6xl mx-auto space-y-12 sm:space-y-16">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-neutral-200">
            <div>
              <p className="font-editorial italic text-base sm:text-lg text-neutral-600 mb-1 tracking-tight">
                Clinical Research, Tech &amp; Field Reports
              </p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-neutral-950 leading-[1.05]">
                <span className="font-editorial italic font-normal text-neutral-800 lowercase">the </span>
                <span
                  style={{ fontFamily: 'var(--font-bubble, "DynaPuff", cursive, sans-serif)' }}
                  className="text-crimson font-bold inline-block hover:scale-105 transition-transform duration-200"
                >
                  DISPATCHES
                </span>
              </h2>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${selectedCategory === cat
                    ? 'bg-crimson text-white shadow-md shadow-crimson/20 scale-103'
                    : 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10">
            {filteredArticles.map((article) => (
              <div
                key={article.id}
                onClick={() => setActiveArticleModal(article)}
                className="group relative bg-white rounded-3xl p-5 sm:p-6 border-2 border-neutral-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between cursor-pointer"
              >
                <div className="space-y-4">
                  {/* Photo Thumbnail */}
                  <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden bg-neutral-100">
                    {/* Blank Placeholder */}
                    <div className="w-full h-full bg-neutral-100" />
                    {/* Die-cut badge sticker */}
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md border border-neutral-200 text-[10px] font-bold text-neutral-900 tracking-wider shadow-sm transform group-hover:rotate-2 transition-transform">
                      {article.sticker}
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex items-center gap-3 text-xs text-neutral-500 font-mono">
                    <span className="text-crimson font-bold uppercase">{article.category}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{article.date}</span>
                    </span>
                    <span>•</span>
                    <span>{article.readTime}</span>
                  </div>

                  {/* Article Title */}
                  <h3 className="font-editorial text-xl sm:text-2xl text-neutral-950 font-normal leading-snug group-hover:text-crimson transition-colors">
                    {article.title}
                  </h3>

                  {/* Article Summary */}
                  <p className="font-sans text-xs sm:text-sm text-neutral-600 font-normal leading-relaxed">
                    {article.summary}
                  </p>
                </div>

                {/* Footer credentials badge */}
                <div className="pt-4 mt-6 border-t border-neutral-100 flex items-center justify-between text-xs">
                  <div className="font-editorial italic text-neutral-600 text-xs">
                    By {article.author}
                  </div>
                  <span className="font-mono text-[11px] font-bold text-crimson uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Read Dispatch</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Press Inquiries & Media Kit Banner */}
          <div className="p-8 sm:p-12 rounded-3xl bg-neutral-50 border-2 border-neutral-200 text-center max-w-3xl mx-auto space-y-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-crimson font-bold">
              PRESS &amp; MEDIA DESK
            </span>
            <h4 className="font-editorial text-2xl sm:text-3xl text-neutral-950 font-normal">
              Covering African Healthcare Innovation?
            </h4>
            <p className="font-sans text-xs sm:text-sm text-neutral-600 font-normal leading-relaxed max-w-xl mx-auto">
              We provide journalists, public health researchers, and policymakers with verified maternal health datasets, clinical whitepapers, and executive interview access.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <a
                href="mailto:press@redapplecares.com?subject=Media%20Inquiry%20-%20Red%20Apple"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Contact press@redapplecares.com</span>
              </a>
              <button
                onClick={() => alert('Official Red Apple Media Kit & Brand Photography assets downloaded.')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-neutral-100 border-2 border-neutral-300 text-neutral-900 text-xs font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Media Kit (PDF)</span>
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* 5. Article Reader Modal */}
      {activeArticleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <div
            onClick={() => setActiveArticleModal(null)}
            className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm transition-opacity"
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border-2 border-neutral-200 p-6 sm:p-10 z-10 space-y-6 max-h-[90vh] overflow-y-auto my-auto">

            {/* Top Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-2 text-xs font-mono text-neutral-500">
                <span className="font-bold text-crimson uppercase">{activeArticleModal.category}</span>
                <span>•</span>
                <span>{activeArticleModal.date}</span>
                <span>•</span>
                <span>{activeArticleModal.readTime}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyLink}
                  className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center transition-colors cursor-pointer"
                  title="Share / Copy Link"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setActiveArticleModal(null)}
                  className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Close article"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Article Headline & Author */}
            <div className="space-y-3">
              <h2 className="font-editorial text-2xl sm:text-3xl md:text-4xl text-neutral-950 font-normal leading-tight">
                {activeArticleModal.title}
              </h2>
              <div className="flex items-center gap-2 text-xs text-neutral-600">
                <span className="font-bold text-neutral-900">{activeArticleModal.author}</span>
                <span className="text-neutral-400">/</span>
                <span className="font-editorial italic">{activeArticleModal.authorRole}</span>
              </div>
            </div>

            {/* Full-width Image */}
            <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200 shadow-sm">
              {/* Blank Placeholder */}
              <div className="w-full h-full bg-neutral-100 min-h-[200px]" />
            </div>

            {/* Key Clinical Takeaways Box */}
            {activeArticleModal.takeaways && (
              <div className="p-5 sm:p-6 rounded-2xl bg-neutral-50 border-2 border-neutral-200/80 space-y-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-crimson font-bold">
                  KEY CLINICAL TAKEAWAYS
                </span>
                <ul className="space-y-2 text-xs sm:text-sm text-neutral-700 font-normal">
                  {activeArticleModal.takeaways.map((point, pIdx) => (
                    <li key={pIdx} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-crimson mt-2 shrink-0" />
                      <span className="leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Article Full Body */}
            <div className="space-y-4 text-xs sm:text-sm text-neutral-700 leading-relaxed font-normal pt-2">
              {activeArticleModal.fullBody?.map((para, pIdx) => (
                <p key={pIdx} className="leading-relaxed">
                  {para}
                </p>
              ))}
            </div>

            {/* Modal Bottom CTA */}
            <div className="pt-6 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-neutral-500 font-mono">
                RED APPLE CLINICAL EDITORIAL BOARD • NDPA VETTED
              </div>
              <button
                onClick={() => setActiveArticleModal(null)}
                className="px-6 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Close Article
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 6. Global Footer */}
      <Footer />

    </div>
  );
};
