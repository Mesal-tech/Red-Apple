import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { IntroMissionSection } from './components/IntroMissionSection';
import { ImpactSection } from './components/ImpactSection';
import { ThreePillarsSection } from './components/ThreePillarsSection';
import { TeamSquadSection } from './components/TeamSquadSection';
import { TractionSection } from './components/TractionSection';
import { Footer } from './components/Footer';
import { AboutPage } from './pages/AboutPage';
import { NewsroomPage } from './pages/NewsroomPage';
import { ContactPage } from './pages/ContactPage';
import { CookieConsent } from './components/CookieConsent';

export type PageType = 'home' | 'about' | 'newsroom' | 'contact';

export function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');

  useEffect(() => {
    const handleLocation = () => {
      const path = window.location.pathname.toLowerCase().replace(/\/$/, '') || '/';
      const hash = window.location.hash.toLowerCase();

      if (path === '/about' || hash === '#about' || hash === '#about-page') {
        setCurrentPage('about');
      } else if (path === '/newsroom' || hash === '#newsroom' || hash === '#news' || hash === '#press') {
        setCurrentPage('newsroom');
      } else if (path === '/contact' || path === '/talk-to-us' || hash === '#contact-page' || hash === '#talk-to-us') {
        setCurrentPage('contact');
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

  const navigateTo = (page: PageType) => {
    const routes: Record<PageType, string> = {
      home: '/',
      about: '/about',
      newsroom: '/newsroom',
      contact: '/contact',
    };
    window.history.pushState({}, '', routes[page]);
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Intercept anchor clicks across the app for fast client-side SPA navigation
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href) return;

      // Ignore external or specialized links
      if (
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        anchor.hasAttribute('download') ||
        anchor.target === '_blank'
      ) {
        return;
      }

      // Handle in-page hash links when on a secondary page
      if (href.startsWith('#')) {
        if (currentPage !== 'home') {
          e.preventDefault();
          window.history.pushState({}, '', '/' + href);
          setCurrentPage('home');
          setTimeout(() => {
            const targetEl = document.querySelector(href);
            if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
        return;
      }

      // Handle root-prefixed hash links like /#products or /#investors
      if (href.startsWith('/#')) {
        const hash = href.substring(1);
        e.preventDefault();
        window.history.pushState({}, '', '/' + hash);
        setCurrentPage('home');
        setTimeout(() => {
          const targetEl = document.querySelector(hash);
          if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        return;
      }

      // Handle internal routes
      const cleanHref = href.toLowerCase().replace(/\/$/, '') || '/';
      const routePages: Record<string, PageType> = {
        '/': 'home',
        '/about': 'about',
        '/newsroom': 'newsroom',
        '/contact': 'contact',
        '/talk-to-us': 'contact',
      };

      if (cleanHref in routePages) {
        e.preventDefault();
        navigateTo(routePages[cleanHref]);
      }
    };

    window.addEventListener('click', handleLinkClick);
    return () => window.removeEventListener('click', handleLinkClick);
  }, [currentPage]);

  return (
    <>
      {currentPage === 'about' && (
        <AboutPage onNavigateHome={() => navigateTo('home')} />
      )}

      {currentPage === 'newsroom' && (
        <NewsroomPage onNavigate={(page) => navigateTo(page as PageType)} />
      )}

      {currentPage === 'contact' && (
        <ContactPage onNavigate={(page) => navigateTo(page as PageType)} />
      )}

      {currentPage === 'home' && (
        <main className="w-full min-h-screen bg-white text-neutral-900 overflow-x-hidden relative font-sans">
          {/* 1. Top Navigation */}
          <Navbar brandName="RED APPLE" />

          {/* 2. Hero Section */}
          <HeroSection brandName="RED APPLE" />

          {/* 3. Who We Are: The Clinicians & Minds Behind Red Apple (Extrafazant Collage & Story) */}
          <IntroMissionSection />

          {/* 4. The Impact & Maternal Health Mission */}
          <ImpactSection />

          {/* 4. The Three Connected Pillars (App, Connect, OS) */}
          <ThreePillarsSection />

          {/* 5. The Team Squad (Extrafazant ABCDEF-TEAM Style) */}
          <TeamSquadSection />

          {/* 6. Traction & Milestones Roadmap */}
          <TractionSection />

          {/* 8. Global Footer */}
          <Footer />
        </main>
      )}

      {/* Floating Cookie Consent Prompt & Custom Preferences Modal */}
      <CookieConsent />
    </>
  );
}

export default App;
