import React from 'react';
import { X, History, CheckCircle2, XCircle, Trash2, ArrowUpRight, Copy, Check } from 'lucide-react';
import type { SentEmailRecord } from '../types/email';

interface SentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: SentEmailRecord[];
  onClear: () => void;
  onSelectRecord: (record: SentEmailRecord) => void;
}

export const SentHistoryModal: React.FC<SentHistoryModalProps> = ({
  isOpen,
  onClose,
  records,
  onClear,
  onSelectRecord,
}) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 ring-1 ring-red-200/80">
              <History className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">Sent Email History</h2>
              <p className="text-xs text-zinc-500">
                {records.length} {records.length === 1 ? 'dispatch' : 'dispatches'} recorded
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {records.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                title="Clear all log history"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* List of Sent Records */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-400">
              <div className="rounded-full bg-zinc-100 p-4 mb-3">
                <History className="h-8 w-8 text-zinc-300" />
              </div>
              <p className="text-sm font-semibold text-zinc-700">No emails sent yet</p>
              <p className="text-xs text-zinc-500 max-w-xs mt-1">
                Emails dispatched using the Resend API during this session will be recorded here.
              </p>
            </div>
          ) : (
            records.map((record) => (
              <div
                key={record.id}
                className="group relative rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-red-200 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {record.status === 'sent' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Sent
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-600/20">
                          <XCircle className="h-3 w-3 text-rose-600" /> Failed
                        </span>
                      )}
                      <span className="text-xs text-zinc-400">&bull;</span>
                      <span className="text-xs font-mono text-zinc-500">
                        {formatDate(record.sentAt)}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-zinc-900 truncate">
                      {record.subject || '(No Subject)'}
                    </h3>

                    <div className="text-xs text-zinc-500 truncate">
                      To: <span className="font-medium text-zinc-800">{record.to}</span>
                    </div>

                    {record.errorMessage && (
                      <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg mt-1 font-mono">
                        {record.errorMessage}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectRecord(record);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700 transition-colors"
                    >
                      Load into Editor
                      <ArrowUpRight className="h-3 w-3" />
                    </button>

                    {record.resendId && record.resendId !== 'N/A' && record.resendId !== 'failed' && (
                      <button
                        type="button"
                        onClick={() => handleCopy(record.resendId)}
                        className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-600 font-mono"
                        title="Copy Resend Message ID"
                      >
                        {copiedId === record.resendId ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span className="text-emerald-600 font-sans">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>{record.resendId.slice(0, 12)}...</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-100 p-4 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
