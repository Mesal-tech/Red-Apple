import { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { IntroMissionSection } from './components/IntroMissionSection';
import { ImpactSection } from './components/ImpactSection';
import { ThreePillarsSection } from './components/ThreePillarsSection';
import { TractionSection } from './components/TractionSection';
import { Footer } from './components/Footer';
import { AboutPage } from './pages/AboutPage';
import { NewsroomPage } from './pages/NewsroomPage';
import { ArticleDetailPage } from './pages/ArticleDetailPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsOfUsePage } from './pages/TermsOfUsePage';
import { CookieConsent } from './components/CookieConsent';
import { SplashScreen } from './components/SplashScreen';

export type PageType = 'home' | 'about' | 'newsroom' | 'article' | 'privacy' | 'terms';

export function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [currentArticleSlug, setCurrentArticleSlug] = useState<string>('cervical-cancer-screening-initiative');
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const pendingPageRef = useRef<PageType | null>(null);
  const pendingSlugRef = useRef<string | null>(null);
  const isInitialMountRef = useRef<boolean>(true);

  const getPageFromLocation = (): { page: PageType; slug?: string } => {
    const path = window.location.pathname.toLowerCase().replace(/\/$/, '') || '/';
    const hash = window.location.hash.toLowerCase();

    if (path.startsWith('/newsroom/') && path.length > '/newsroom/'.length) {
      const slug = path.substring('/newsroom/'.length);
      return { page: 'article', slug };
    }
    if (hash.startsWith('#newsroom/') && hash.length > '#newsroom/'.length) {
      const slug = hash.substring('#newsroom/'.length);
      return { page: 'article', slug };
    }
    if (path === '/about' || hash === '#about' || hash === '#about-page') {
      return { page: 'about' };
    } else if (path === '/newsroom' || hash === '#newsroom' || hash === '#news' || hash === '#press') {
      return { page: 'newsroom' };
    } else if (path === '/privacy' || path === '/privacy-policy' || hash === '#privacy' || hash === '#privacy-policy') {
      return { page: 'privacy' };
    } else if (path === '/terms' || path === '/terms-of-use' || path === '/terms-and-conditions' || hash === '#terms') {
      return { page: 'terms' };
    }
    return { page: 'home' };
  };

  const navigateTo = useCallback((page: PageType, slug?: string) => {
    if (page === currentPage && (!slug || slug === currentArticleSlug)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    pendingPageRef.current = page;
    if (slug) pendingSlugRef.current = slug;
    setIsTransitioning(true);
  }, [currentPage, currentArticleSlug]);

  const handleCovered = useCallback(() => {
    const target = pendingPageRef.current;
    if (target) {
      if (target === 'article') {
        const slug = pendingSlugRef.current || currentArticleSlug || 'cervical-cancer-screening-initiative';
        window.history.pushState({}, '', `/newsroom/${slug}`);
        setCurrentArticleSlug(slug);
        setCurrentPage('article');
      } else {
        const routes: Record<Exclude<PageType, 'article'>, string> = {
          home: '/',
          about: '/about',
          newsroom: '/newsroom',
          privacy: '/privacy',
          terms: '/terms',
        };
        window.history.pushState({}, '', routes[target as Exclude<PageType, 'article'>]);
        setCurrentPage(target);
      }
      window.scrollTo(0, 0);
    }
  }, [currentArticleSlug]);

  const handleTransitionComplete = useCallback(() => {
    setIsTransitioning(false);
    pendingPageRef.current = null;
    pendingSlugRef.current = null;
  }, []);

  useEffect(() => {
    const handleLocation = () => {
      const target = getPageFromLocation();
      if (isInitialMountRef.current) {
        isInitialMountRef.current = false;
        setCurrentPage(target.page);
        if (target.slug) setCurrentArticleSlug(target.slug);
        return;
      }
      if (target.page !== currentPage || (target.page === 'article' && target.slug !== currentArticleSlug)) {
        navigateTo(target.page, target.slug);
      }
    };

    window.addEventListener('popstate', handleLocation);
    window.addEventListener('hashchange', handleLocation);

    return () => {
      window.removeEventListener('popstate', handleLocation);
      window.removeEventListener('hashchange', handleLocation);
    };
  }, [currentPage, currentArticleSlug, navigateTo]);

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
          navigateTo('home');
          setTimeout(() => {
            const targetEl = document.querySelector(href);
            if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
          }, 850);
        }
        return;
      }

      // Handle root-prefixed hash links like /#products or /#investors
      if (href.startsWith('/#')) {
        const hash = href.substring(1);
        if (currentPage !== 'home') {
          e.preventDefault();
          navigateTo('home');
          setTimeout(() => {
            const targetEl = document.querySelector(hash);
            if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
          }, 850);
        }
        return;
      }

      // Handle internal routes
      const cleanHref = href.toLowerCase().replace(/\/$/, '') || '/';

      if (cleanHref.startsWith('/newsroom/') && cleanHref.length > '/newsroom/'.length) {
        e.preventDefault();
        const slug = cleanHref.substring('/newsroom/'.length);
        navigateTo('article', slug);
        return;
      }

      const routePages: Record<string, PageType> = {
        '/': 'home',
        '/about': 'about',
        '/newsroom': 'newsroom',
        '/privacy': 'privacy',
        '/privacy-policy': 'privacy',
        '/terms': 'terms',
        '/terms-of-use': 'terms',
        '/terms-and-conditions': 'terms',
      };

      if (cleanHref in routePages) {
        e.preventDefault();
        navigateTo(routePages[cleanHref]);
      }
    };

    window.addEventListener('click', handleLinkClick);
    return () => window.removeEventListener('click', handleLinkClick);
  }, [currentPage, navigateTo]);

  return (
    <>
      {/* Dynamic Crimson Squiggly Path Splash & Page Transition */}
      <SplashScreen
        isTransitioning={isTransitioning}
        onCovered={handleCovered}
        onComplete={handleTransitionComplete}
        playOnInitialLoad={true}
      />

      {currentPage === 'about' && (
        <AboutPage onNavigateHome={() => navigateTo('home')} />
      )}

      {currentPage === 'newsroom' && (
        <NewsroomPage
          onNavigate={(page) => navigateTo(page as PageType)}
          onNavigateToArticle={(slug) => navigateTo('article', slug)}
        />
      )}

      {currentPage === 'article' && (
        <ArticleDetailPage
          slug={currentArticleSlug}
          onNavigateBack={() => navigateTo('newsroom')}
          onNavigateToArticle={(slug) => navigateTo('article', slug)}
        />
      )}

      {currentPage === 'privacy' && (
        <PrivacyPolicyPage
          onNavigateHome={() => navigateTo('home')}
          onNavigateToTerms={() => navigateTo('terms')}
        />
      )}

      {currentPage === 'terms' && (
        <TermsOfUsePage
          onNavigateHome={() => navigateTo('home')}
          onNavigateToPrivacy={() => navigateTo('privacy')}
        />
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
