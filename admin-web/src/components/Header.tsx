import React from 'react';
import { Edit3, Inbox, Send } from 'lucide-react';

export type AdminView = 'compose' | 'inbox' | 'sent';

interface HeaderProps {
  currentView: AdminView;
  onViewChange: (view: AdminView) => void;
  inboxCount?: number;
  sentCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  inboxCount = 0,
  sentCount = 0,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2 sm:px-6 lg:px-8">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-red-100 shadow-2xs shrink-0">
            <img
              src="/red-apple-logo.png"
              alt="Red Apple"
              className="h-6 w-6 sm:h-7 sm:w-7 object-contain"
            />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="font-bold text-zinc-900 tracking-tight text-sm sm:text-lg whitespace-nowrap">
              Red Apple
            </span>
            <span className="hidden sm:inline-block rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
              Admin
            </span>
          </div>
        </div>

        {/* Center / Right: View Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-zinc-200 bg-zinc-100/70 p-0.5 sm:p-1 shadow-2xs">
          {/* Write / Compose */}
          <button
            type="button"
            onClick={() => onViewChange('compose')}
            className={`inline-flex items-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
              currentView === 'compose'
                ? 'bg-white text-zinc-900 shadow-xs ring-1 ring-zinc-200/70'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/50'
            }`}
          >
            <Edit3 className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${currentView === 'compose' ? 'text-red-600' : 'text-zinc-500'}`} />
            <span>Write</span>
          </button>

          {/* Inbox (Received) */}
          <button
            type="button"
            onClick={() => onViewChange('inbox')}
            className={`inline-flex items-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
              currentView === 'inbox'
                ? 'bg-white text-zinc-900 shadow-xs ring-1 ring-zinc-200/70'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/50'
            }`}
          >
            <Inbox className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${currentView === 'inbox' ? 'text-red-600' : 'text-zinc-500'}`} />
            <span>Inbox</span>
            {inboxCount > 0 && (
              <span className={`flex h-4 min-w-[15px] sm:min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] sm:text-[10px] font-bold ${
                currentView === 'inbox' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700'
              }`}>
                {inboxCount}
              </span>
            )}
          </button>

          {/* Sent */}
          <button
            type="button"
            onClick={() => onViewChange('sent')}
            className={`inline-flex items-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
              currentView === 'sent'
                ? 'bg-white text-zinc-900 shadow-xs ring-1 ring-zinc-200/70'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/50'
            }`}
          >
            <Send className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${currentView === 'sent' ? 'text-red-600' : 'text-zinc-500'}`} />
            <span>Sent</span>
            {sentCount > 0 && (
              <span className="flex h-4 min-w-[15px] sm:min-w-[16px] items-center justify-center rounded-full bg-zinc-200/80 px-1 text-[9px] sm:text-[10px] font-bold text-zinc-700">
                {sentCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

