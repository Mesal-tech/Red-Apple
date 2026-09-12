import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { ImpactSection } from './components/ImpactSection';
import { ThreePillarsSection } from './components/ThreePillarsSection';
import { InvestorOpportunitySection } from './components/InvestorOpportunitySection';
import { TractionSection } from './components/TractionSection';
import { ClosingCTA } from './components/ClosingCTA';
import { Footer } from './components/Footer';
import { AboutPage } from './pages/AboutPage';

export function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'about'>('home');

  useEffect(() => {
    const handleLocation = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (path === '/about' || hash === '#about' || hash === '#about-page') {
        setCurrentPage('about');
      } else {
        setCurrentPage('home');
      }
    };

    handleLocation();
    window.addEventListener('popstate', handleLocation);
    window.addEventListener('hashchange', handleLocation);

    return () => {
      window.removeEventListener('popstate', handleLocation);
      window.removeEventListener('hashchange', handleLocation);
    };
  }, []);

  const navigateTo = (page: 'home' | 'about') => {
    if (page === 'about') {
      window.history.pushState({}, '', '/about');
      setCurrentPage('about');
    } else {
      window.history.pushState({}, '', '/');
      setCurrentPage('home');
    }
  };

  if (currentPage === 'about') {
    return <AboutPage onNavigateHome={() => navigateTo('home')} />;
  }

  return (
    <main className="w-full min-h-screen bg-black overflow-x-hidden relative font-sans">
      {/* 1. Top Editorial Navigation */}
      <Navbar brandName="RED APPLE" />

      {/* 2. Hero Section with GSAP Pinned Curtain Transition */}
      <HeroSection brandName="RED APPLE" />

      {/* 3. The Impact & Maternal Reality Manifesto (3-Stage Cinematic Video Scroll) */}
      <ImpactSection />

      {/* 4. The Three Connected Pillars (App, Connect, OS) */}
      <ThreePillarsSection />

      {/* 5. The Investor Opportunity & Connected System Flywheel */}
      <InvestorOpportunitySection />

      {/* 6. Traction & Milestones Roadmap */}
      <TractionSection />

      {/* 7. Closing Stakeholder Inquiry CTA */}
      <ClosingCTA />

      {/* 8. Enterprise Global Footer */}
      <Footer />
    </main>
  );
}

export default App;
