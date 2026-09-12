import React from 'react';
import { CheckCircle2, AlertCircle, X, Copy, Check } from 'lucide-react';

export interface ToastData {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  resendId?: string;
}

interface ToastNotificationProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toasts, onDismiss }) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-md w-full px-4 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-xl backdrop-blur-md transition-all animate-in slide-in-from-bottom-5 duration-200 ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50/95 text-emerald-950 ring-1 ring-emerald-500/20'
              : toast.type === 'error'
              ? 'border-red-200 bg-white text-zinc-900 ring-1 ring-red-500/20 shadow-red-500/5'
              : 'border-zinc-200 bg-white text-zinc-900 ring-1 ring-zinc-500/10'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          )}

          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold tracking-tight">
              {toast.title}
            </h4>
            <p className="mt-0.5 text-xs text-zinc-600 leading-relaxed break-words">
              {toast.message}
            </p>

            {toast.resendId && (
              <div className="mt-2 flex items-center gap-2 rounded-md bg-zinc-100 px-2.5 py-1 text-[11px] font-mono text-zinc-700 w-fit">
                <span>ID: {toast.resendId}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(toast.resendId!)}
                  className="hover:text-zinc-900 p-0.5 rounded cursor-pointer"
                  title="Copy Resend ID"
                >
                  {copiedId === toast.resendId ? (
                    <Check className="h-3 w-3 text-emerald-600" />
                  ) : (
                    <Copy className="h-3 w-3 text-zinc-400" />
                  )}
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="rounded-lg p-1 text-zinc-400 hover:bg-black/5 hover:text-zinc-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
