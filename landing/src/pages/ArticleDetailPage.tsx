import React, { useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { NEWS_ARTICLES, getArticleBySlug, type NewsArticle } from '../data/newsArticles';

interface ArticleDetailPageProps {
  slug: string;
  onNavigateBack: () => void;
  onNavigateToArticle: (slug: string) => void;
}

export const ArticleDetailPage: React.FC<ArticleDetailPageProps> = ({
  slug,
  onNavigateBack,
  onNavigateToArticle
}) => {
  const article: NewsArticle = getArticleBySlug(slug) || NEWS_ARTICLES[0];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  // Get up to 3 related articles (excluding the current one)
  const relatedArticles = NEWS_ARTICLES
    .filter((a) => a.id !== article.id)
    .slice(0, 3);

  return (
    <div className="w-full min-h-screen bg-white text-neutral-900 font-sans selection:bg-red-100 overflow-x-hidden">

      {/* Floating Navbar */}
      <Navbar brandName="RED APPLE" activePage="newsroom" />

      {/* Main Container bounded by Terra-style vertical dashed borders */}
      <div className="max-w-7xl mx-auto border-x border-dashed border-neutral-300">

        {/* 1. Header Section (Matching Terra Screenshot 1) */}
        <header className="pt-16 sm:pt-20 pb-8 sm:pb-12 px-6 sm:px-10 lg:px-12 border-b border-dashed border-neutral-300">
          {/* Back to Newsroom Link */}
          <div className="mb-6 sm:mb-8">
            <button
              onClick={onNavigateBack}
              className="group inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-neutral-900 hover:text-crimson transition-colors cursor-pointer select-none"
            >
              <span className="transition-transform duration-200 group-hover:-translate-x-1 font-mono">←</span>
              <span>Back to Newsroom</span>
            </button>
          </div>

          {/* Date */}
          <div className="font-mono text-xs sm:text-sm text-neutral-500 font-medium mb-3 uppercase tracking-wider">
            {article.date}
          </div>

          {/* Title */}
          <h1 className="font-sans font-extrabold text-3xl sm:text-4xl md:text-5xl lg:text-[56px] text-neutral-950 tracking-[-0.03em] leading-[1.08] max-w-5xl">
            {article.title}
          </h1>

          {/* Byline */}
          <div className="mt-4 sm:mt-5 text-xs sm:text-sm text-neutral-500 font-medium">
            By {article.author}
          </div>
        </header>

        {/* 2. Hero Image Banner (Matching Terra Screenshot 1 & 2) */}
        <div className="px-6 sm:px-10 lg:px-12 py-8 sm:py-12 border-b border-dashed border-neutral-300">
          <div className="w-full aspect-[21/9] sm:aspect-[16/7] overflow-hidden bg-neutral-100 border border-neutral-200/60">
            <img
              src={article.image}
              alt={article.imageAlt}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* 3. Two-Column Content Layout (Matching Terra Screenshots 2, 3 & 4) */}
        <main className="px-6 sm:px-10 lg:px-12 py-12 sm:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">

            {/* Left Column: Bold Lead Paragraph & Takeaways (Terra Screenshots 2, 3, 4) */}
            <aside className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
              <h2 className="font-sans font-bold text-xl sm:text-2xl md:text-[25px] text-neutral-950 leading-snug tracking-tight">
                {article.summary}
              </h2>

              {/* Key Clinical Takeaways Callout */}
              {article.takeaways && article.takeaways.length > 0 && (
                <div className="p-5 sm:p-6 bg-neutral-50 border border-dashed border-neutral-300 space-y-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-crimson font-bold">
                    CLINICAL PROTOCOL IMPACT
                  </p>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-neutral-700 font-normal">
                    {article.takeaways.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 bg-crimson mt-2 shrink-0" />
                        <span className="leading-relaxed">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>

            {/* Right Column: Main Article Body & Pullquote (Terra Screenshots 2, 3, 4) */}
            <article className="lg:col-span-7 space-y-6 text-sm sm:text-base text-neutral-800 leading-relaxed font-normal">
              {article.fullBody.map((paragraph, idx) => (
                <React.Fragment key={idx}>
                  <p className="leading-relaxed">
                    {paragraph}
                  </p>

                  {/* Pullquote with thick 3px black left bar (Matching Terra Screenshot 4) */}
                  {idx === 1 && article.pullQuote && (
                    <div className="border-l-[3px] border-neutral-950 pl-5 my-8 space-y-2">
                      <p className="font-sans font-bold text-base sm:text-lg text-neutral-950 leading-snug">
                        “{article.pullQuote.text}”
                      </p>
                      <p className="text-xs sm:text-sm text-neutral-500 font-normal">
                        — {article.pullQuote.author}, {article.pullQuote.role}
                      </p>
                    </div>
                  )}
                </React.Fragment>
              ))}

              {/* Clinical Editorial Governance Tag */}
              <div className="pt-8 mt-8 border-t border-dashed border-neutral-200 text-xs font-mono text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                <span>RED APPLE HEALTH CLINICAL EDITORIAL BOARD</span>
              </div>
            </article>

          </div>
        </main>

        {/* 4. More Dispatches from the Newsroom (Matching Terra 3-column Card Grid) */}
        <section className="py-12 sm:py-16 px-6 sm:px-10 lg:px-12 border-t border-dashed border-neutral-300 bg-neutral-50/40">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-dashed border-neutral-300">
            <h2 className="font-sans font-bold text-xl sm:text-2xl text-neutral-950 tracking-tight">
              More Dispatches from the Newsroom
            </h2>
            <button
              onClick={onNavigateBack}
              className="text-xs font-mono uppercase tracking-wider text-neutral-600 hover:text-neutral-950 flex items-center gap-1 cursor-pointer font-semibold"
            >
              <span>View All</span>
              <span>→</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 lg:gap-x-10 gap-y-12">
            {relatedArticles.map((rel) => (
              <div
                key={rel.id}
                onClick={() => onNavigateToArticle(rel.slug)}
                className="group flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="relative w-full aspect-[16/10] overflow-hidden bg-neutral-100 border border-neutral-200/60">
                    <img
                      src={rel.image}
                      alt={rel.imageAlt}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <p className="mt-4 mb-2 font-mono text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">
                    {rel.date}
                  </p>
                  <h3 className="font-sans font-bold text-base sm:text-lg leading-snug text-neutral-950 group-hover:text-crimson transition-colors line-clamp-2">
                    {rel.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-neutral-600 font-normal leading-relaxed line-clamp-2">
                    {rel.summary}
                  </p>
                </div>
                <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-900 group-hover:text-crimson transition-colors">
                  <span>Read more</span>
                  <span className="font-mono">→</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Global Footer */}
      <Footer />

    </div>
  );
};
