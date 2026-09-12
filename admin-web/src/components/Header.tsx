import React from 'react';
import { History } from 'lucide-react';

interface HeaderProps {
  historyCount: number;
  onOpenHistory: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  historyCount,
  onOpenHistory,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-red-100 shadow-2xs">
            <img
              src="/red-apple-logo.png"
              alt="Red Apple"
              className="h-7 w-7 object-contain"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-900 tracking-tight text-base sm:text-lg">
              Red Apple
            </span>
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
              Admin
            </span>
          </div>
        </div>

        {/* Right: Sent Log */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenHistory}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:text-zinc-900 hover:border-zinc-300 transition-colors cursor-pointer"
          >
            <History className="h-3.5 w-3.5 text-zinc-500" />
            <span>Sent Log</span>
            {historyCount > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-100 px-1 text-[10px] font-bold text-red-600">
                {historyCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
