import React from 'react';
import { LayoutDashboard, BookOpen, UserCheck, Edit3, Inbox, Send, Apple } from 'lucide-react';

export type AdminView = 'overview' | 'articles' | 'doctors' | 'compose' | 'inbox' | 'sent';

interface HeaderProps {
  currentView: AdminView;
  onViewChange: (view: AdminView) => void;
  inboxCount?: number;
  sentCount?: number;
}

const sections: { label: string; items: { view: AdminView; label: string; icon: React.ElementType }[] }[] = [
  { label: 'Workspace', items: [
    { view: 'overview', label: 'Overview', icon: LayoutDashboard },
    { view: 'articles', label: 'Articles', icon: BookOpen },
    { view: 'doctors', label: 'Doctors', icon: UserCheck },
  ] },
  { label: 'Communications', items: [
    { view: 'compose', label: 'Campaigns', icon: Edit3 },
    { view: 'inbox', label: 'Inbox', icon: Inbox },
    { view: 'sent', label: 'Sent email', icon: Send },
  ] },
];

export const Header: React.FC<HeaderProps> = ({ currentView, onViewChange, inboxCount = 0, sentCount = 0 }) => {
  const counts: Partial<Record<AdminView, number>> = { inbox: inboxCount, sent: sentCount };
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2 sm:px-6">
          <button type="button" onClick={() => onViewChange('overview')} className="flex shrink-0 items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white ring-1 ring-red-100"><img src="/red-apple-logo.png" alt="" className="h-6 w-6 object-contain" /></span>
            <span className="text-sm font-bold tracking-tight text-zinc-900">Red Apple <span className="ml-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-zinc-500">Admin</span></span>
          </button>
          <nav aria-label="Main navigation" className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-100/70 p-1">
            {sections.flatMap((section) => section.items).map(({ view, label, icon: Icon }) => (
              <button key={view} type="button" onClick={() => onViewChange(view)} aria-current={currentView === view ? 'page' : undefined}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors sm:px-3 ${currentView === view ? 'bg-white text-zinc-900 shadow-xs ring-1 ring-zinc-200/70' : 'text-zinc-600 hover:bg-white/70'}`}>
                <Icon className={`h-3.5 w-3.5 ${currentView === view ? 'text-red-600' : 'text-zinc-500'}`} />
                <span>{label}</span>
                {!!counts[view] && <span className="rounded-full bg-red-100 px-1.5 text-[10px] text-red-700">{counts[view]}</span>}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-[#101010] px-3 py-5 text-zinc-300 lg:sticky lg:top-0 lg:flex" aria-label="Main navigation">
        <button type="button" onClick={() => onViewChange('overview')} className="mb-10 flex items-center gap-3 px-3 text-left">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white"><img src="/red-apple-logo.png" alt="" className="h-7 w-7 object-contain" /></span>
          <span className="text-base font-bold tracking-tight text-white">Red Apple<span className="ml-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">Admin</span></span>
        </button>
        <div className="space-y-8">
          {sections.map((section) => <div key={section.label}>
            <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-zinc-500">{section.label}</p>
            <nav className="space-y-1">
              {section.items.map(({ view, label, icon: Icon }) => {
                const active = currentView === view;
                return <button key={view} type="button" onClick={() => onViewChange(view)} aria-current={active ? 'page' : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${active ? 'bg-white/10 font-medium text-white ring-1 ring-white/5' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
                  <Icon className={`h-[17px] w-[17px] ${active ? 'text-rose-400' : 'text-zinc-500'}`} />
                  <span className="flex-1">{label}</span>
                  {!!counts[view] && <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-300">{counts[view]}</span>}
                </button>;
              })}
            </nav>
          </div>)}
        </div>
        <div className="mt-auto flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-950 text-rose-300"><Apple className="h-4 w-4" /></span>
          <span><span className="block text-xs font-semibold text-white">Clinic workspace</span><span className="mt-0.5 block text-[11px] text-zinc-500">Red Apple Health</span></span>
        </div>
      </aside>
    </>
  );
};
