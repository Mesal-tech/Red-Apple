import React, { useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { NEWS_ARTICLES, type NewsArticle } from '../data/newsArticles';

interface NewsroomPageProps {
  onNavigate?: (page: string) => void;
  onNavigateToArticle?: (slug: string) => void;
}

export const NewsroomPage: React.FC<NewsroomPageProps> = ({
  onNavigateToArticle
}) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const filteredArticles = NEWS_ARTICLES;

  const handleArticleClick = (slug: string) => {
    if (onNavigateToArticle) {
      onNavigateToArticle(slug);
    } else {
      window.location.href = `/newsroom/${slug}`;
    }
  };

  return (
    <div className="w-full min-h-screen bg-white text-neutral-900 font-sans selection:bg-red-100 overflow-x-hidden">

      {/* Floating Top Navbar */}
      <Navbar brandName="RED APPLE" activePage="newsroom" />

      {/* Main Container bounded by Terra-style vertical dashed borders */}
      <div className="max-w-7xl mx-auto border-x border-dashed border-neutral-300">

        {/* 1. Header Section */}
        <header className="pt-28 sm:pt-36 pb-12 sm:pb-16 px-6 sm:px-10 lg:px-12 border-b border-dashed border-neutral-300">
          <div className="max-w-4xl space-y-4">
            <h1 className="font-sans font-extrabold text-5xl sm:text-6xl md:text-7xl lg:text-[76px] text-neutral-950 tracking-[-0.03em] leading-none">
              Newsroom
            </h1>
            <p className="font-sans text-sm sm:text-base md:text-lg text-neutral-600 max-w-2xl leading-relaxed font-normal pt-1">
              Announcements, partnerships and clinical dispatches from Red Apple Health, closing the female reproductive healthcare divide across Africa.
            </p>
          </div>
        </header>

        {/* 3. 3-Column Articles Grid */}
        <main className="py-12 sm:py-16 px-6 sm:px-10 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 lg:gap-x-10 gap-y-12 sm:gap-y-16">
            {filteredArticles.map((article: NewsArticle) => (
              <article
                key={article.id}
                onClick={() => handleArticleClick(article.slug)}
                className="group flex flex-col justify-between cursor-pointer"
              >
                <div>
                  {/* Photo Thumbnail (Crisp Aspect Ratio matching Terra) */}
                  <div className="relative w-full aspect-[16/10] overflow-hidden bg-neutral-100 border border-neutral-200/60">
                    <img
                      src={article.image}
                      alt={article.imageAlt}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>

                  {/* Monospace Uppercase Date */}
                  <div className="mt-4 sm:mt-5 mb-2 font-mono text-[11px] sm:text-xs uppercase tracking-wider text-neutral-500 font-semibold">
                    {article.date}
                  </div>

                  {/* Editorial Headline */}
                  <h2 className="font-sans font-bold text-lg sm:text-[19px] leading-snug text-neutral-950 tracking-tight group-hover:text-crimson transition-colors">
                    {article.title}
                  </h2>

                  {/* Summary Paragraph */}
                  <p className="mt-2.5 text-xs sm:text-sm text-neutral-600 font-normal leading-relaxed line-clamp-3">
                    {article.summary}
                  </p>
                </div>

                {/* Read more Link */}
                <div className="mt-4 sm:mt-5 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-neutral-900 group-hover:text-crimson transition-colors select-none">
                  <span>Read more</span>
                  <span className="transition-transform duration-200 group-hover:translate-x-1 font-mono">
                    →
                  </span>
                </div>
              </article>
            ))}
          </div>
        </main>
      </div>

      {/* Global Footer */}
      <Footer />

    </div>
  );
};
