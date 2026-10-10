import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Clock,
  ShieldCheck,
  X,
  FileText,
} from 'lucide-react';

interface Article {
  id: string;
  title: string;
  category: string;
  readTime: string;
  readers: string;
  author: string;
  summary: string;
  bullets?: string[];
  content?: string;
  medicalReviewedBy: string;
  status: string;
}

const CATEGORIES = ['ALL', 'FERTILITY', 'PREGNANCY', 'CONCEPTION', 'HEALTH GUIDE', 'NUTRITION', 'MENOPAUSE'];

export const EducationArticlesManager: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // New Article Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('FERTILITY');
  const [readTime, setReadTime] = useState('4 min read');
  const [author, setAuthor] = useState('Dr. Mesal Okubor, MBBS, FWACS');
  const [summary, setSummary] = useState('');
  const [bulletsText, setBulletsText] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchArticles();
  }, [selectedCategory]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const url =
        selectedCategory === 'ALL'
          ? 'http://localhost:5000/api/education'
          : `http://localhost:5000/api/education?category=${encodeURIComponent(selectedCategory)}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles || []);
      }
    } catch (e) {
      console.warn('Failed to fetch articles from backend:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !summary) return;

    try {
      setSubmitting(true);
      const bullets = bulletsText
        .split('\n')
        .map((b) => b.trim())
        .filter(Boolean);

      const res = await fetch('http://localhost:5000/api/education', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          readTime,
          author,
          summary,
          bullets,
          content: content || summary,
          medicalReviewedBy: 'Dr. Mesal Okubor, MBBS, FWACS',
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setTitle('');
        setSummary('');
        setBulletsText('');
        setContent('');
        fetchArticles();
      }
    } catch (err) {
      console.error('Create article error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = articles.filter((a) => {
    const q = searchQuery.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.summary.toLowerCase().includes(q) ||
      a.author.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2.5">
            <BookOpen className="h-6 w-6 text-red-600" />
            Medical Education Library (CMS)
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Publish clinical articles, cycle education guides, and reproductive health advice reviewed by certified specialists.{loading ? ' (Syncing...)' : ''}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>New Article</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-4 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:border-red-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((article) => (
          <div
            key={article.id}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-extrabold text-red-600 uppercase tracking-wide border border-red-100">
                  {article.category}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                  <Clock className="h-3 w-3" />
                  {article.readTime}
                </span>
              </div>

              <h2 className="text-base font-bold text-zinc-900 leading-snug">
                {article.title}
              </h2>

              <p className="mt-2 text-xs text-zinc-600 line-clamp-3 leading-relaxed">
                {article.summary}
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-[11px] font-semibold text-zinc-700 truncate">
                  {article.medicalReviewedBy || article.author}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Article Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-red-600" />
                <h2 className="text-base font-bold text-zinc-900">Publish New Medical Article</h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateArticle} className="p-6 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">Article Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Understanding Basal Body Temperature & Ovulation"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 text-zinc-900 focus:border-red-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 text-zinc-900 focus:border-red-500 focus:outline-hidden"
                  >
                    {CATEGORIES.filter((c) => c !== 'ALL').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Read Time</label>
                  <input
                    type="text"
                    value={readTime}
                    onChange={(e) => setReadTime(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 text-zinc-900 focus:border-red-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Medical Reviewer / Author</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 text-zinc-900 focus:border-red-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Summary (1–2 sentences)</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Brief overview explaining what the patient will learn..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 text-zinc-900 focus:border-red-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Clinical Key Takeaways (One per line)</label>
                <textarea
                  rows={3}
                  placeholder="Takeaway bullet 1&#10;Takeaway bullet 2&#10;Takeaway bullet 3"
                  value={bulletsText}
                  onChange={(e) => setBulletsText(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 text-zinc-900 focus:border-red-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Full Article Body</label>
                <textarea
                  rows={5}
                  placeholder="Full clinical explanation for patients..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 text-zinc-900 focus:border-red-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-red-600 hover:bg-red-700 px-5 py-2 font-bold text-white shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Publish to Mobile App'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
