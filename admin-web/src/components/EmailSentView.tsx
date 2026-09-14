import React, { useState, useEffect, useCallback } from 'react';
import {
  Send,
  RefreshCw,
  Search,
  RotateCcw,
  CheckCircle2,
  Mail,
  AlertCircle,
  Copy,
  Check,
  Code,
  FileText,
  Trash2,
} from 'lucide-react';
import type { ResendSentEmail, SentEmailRecord, ResendSettings } from '../types/email';
import { getResendSentEmails, getResendSentEmailDetail, getSentHistory, clearSentHistory } from '../services/emailService';

interface EmailSentViewProps {
  settings: ResendSettings;
  onReuse: (draftData: { to: string; subject: string; html: string }) => void;
  onUpdateBadgeCount?: (count: number) => void;
}

export const EmailSentView: React.FC<EmailSentViewProps> = ({
  settings,
  onReuse,
  onUpdateBadgeCount,
}) => {
  const [resendEmails, setResendEmails] = useState<ResendSentEmail[]>([]);
  const [localRecords, setLocalRecords] = useState<SentEmailRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ResendSentEmail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [viewFormat, setViewFormat] = useState<'html' | 'text'>('html');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchSent = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const local = getSentHistory();
      setLocalRecords(local);

      const remote = await getResendSentEmails(settings);
      setResendEmails(remote);

      const totalCount = Math.max(remote.length, local.length);
      if (onUpdateBadgeCount) {
        onUpdateBadgeCount(totalCount);
      }

      // Auto-select on desktop ONLY (screen width >= 1024)
      if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
        if (remote.length > 0 && !selectedEmailId) {
          setSelectedEmailId(remote[0].id);
        } else if (local.length > 0 && !selectedEmailId) {
          setSelectedEmailId(local[0].id);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load sent emails from Resend';
      setError(msg);
      // Fallback to local history
      const local = getSentHistory();
      setLocalRecords(local);
      if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
        if (local.length > 0 && !selectedEmailId) {
          setSelectedEmailId(local[0].id);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [settings, onUpdateBadgeCount]);

  useEffect(() => {
    fetchSent();
  }, [fetchSent]);

  // Load detail whenever selectedEmailId changes
  useEffect(() => {
    if (!selectedEmailId) {
      setSelectedDetail(null);
      return;
    }

    // Check if it's already in local history with full HTML
    const localMatch = localRecords.find((r) => r.id === selectedEmailId || r.resendId === selectedEmailId);

    let isMounted = true;
    const loadDetail = async () => {
      setIsLoadingDetail(true);
      try {
        // If localMatch has HTML, construct base
        let detailData: ResendSentEmail | null = null;
        if (localMatch) {
          detailData = {
            id: localMatch.resendId || localMatch.id,
            to: [localMatch.to],
            from: localMatch.from,
            subject: localMatch.subject,
            created_at: localMatch.sentAt,
            html: localMatch.html,
            last_event: localMatch.status === 'sent' ? 'delivered' : 'failed',
          };
        }

        // Also fetch from Resend for latest event status & body if available
        try {
          const remoteDetail = await getResendSentEmailDetail(selectedEmailId, settings);
          if (remoteDetail) {
            detailData = {
              ...detailData,
              ...remoteDetail,
              html: remoteDetail.html || detailData?.html,
            };
          }
        } catch {
          // If remote detail fails, keep local
        }

        if (isMounted && detailData) {
          setSelectedDetail(detailData);
        }
      } catch (err) {
        console.error('Failed to load sent email details:', err);
      } finally {
        if (isMounted) {
          setIsLoadingDetail(false);
        }
      }
    };

    loadDetail();
    return () => {
      isMounted = false;
    };
  }, [selectedEmailId, localRecords, settings]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleClear = () => {
    if (window.confirm('Clear all locally saved sent email history from this browser?')) {
      clearSentHistory();
      setLocalRecords([]);
    }
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

  // Combine remote & local records, removing duplicates by ID
  const allSentList: {
    id: string;
    to: string;
    from: string;
    subject: string;
    createdAt: string;
    lastEvent?: string;
    html?: string;
  }[] = [];

  const seenIds = new Set<string>();

  // Prioritize remote records from Resend
  for (const item of resendEmails) {
    seenIds.add(item.id);
    if (item.message_id) seenIds.add(item.message_id);
    allSentList.push({
      id: item.id,
      to: item.to?.join(', ') || '',
      from: item.from,
      subject: item.subject || '(No Subject)',
      createdAt: item.created_at,
      lastEvent: item.last_event || 'sent',
    });
  }

  // Add local records that aren't already listed
  for (const loc of localRecords) {
    if (!seenIds.has(loc.resendId) && !seenIds.has(loc.id)) {
      allSentList.push({
        id: loc.id,
        to: loc.to,
        from: loc.from,
        subject: loc.subject,
        createdAt: loc.sentAt,
        lastEvent: loc.status === 'sent' ? 'delivered' : 'failed',
        html: loc.html,
      });
    }
  }

  const filteredEmails = allSentList.filter((item) => {
    const q = searchQuery.toLowerCase();
    const toMatch = item.to?.toLowerCase().includes(q);
    const subjectMatch = item.subject?.toLowerCase().includes(q);
    const fromMatch = item.from?.toLowerCase().includes(q);
    return toMatch || subjectMatch || fromMatch;
  });

  return (
    <div className="flex-1 flex flex-col bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 px-3.5 sm:px-5 py-3 sm:py-3.5 bg-zinc-50/70">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-red-50 text-red-600 ring-1 ring-red-200/60 shadow-2xs shrink-0">
            <Send className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 truncate">Sent Emails</h2>
              <span className="rounded-full bg-red-100 px-2 py-0.2 text-[10px] sm:text-xs font-bold text-red-700">
                {allSentList.length}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-zinc-500 truncate">
              Dispatched via Resend API
            </p>
          </div>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
          {/* Search Bar */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recipient, subject..."
              className="h-8.5 w-full sm:w-64 rounded-lg border border-zinc-200 bg-white pl-8 pr-3 text-xs text-zinc-800 placeholder-zinc-400 focus:border-red-500 focus:outline-hidden focus:ring-1 focus:ring-red-500/20"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Refresh Button */}
            <button
              type="button"
              onClick={fetchSent}
              disabled={isLoading}
              className="inline-flex h-8.5 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 sm:px-3 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:text-zinc-900 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Sent Log"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-red-600' : 'text-zinc-500'}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {localRecords.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex h-8.5 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 sm:px-3 text-xs font-medium text-zinc-500 shadow-2xs hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                title="Clear local browser records"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Clear Local</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area: Split List & Reader Pane */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-[500px] sm:min-h-[620px] overflow-hidden">
        {/* Left Column: List of Messages */}
        <div className={`lg:col-span-5 xl:col-span-4 border-r border-zinc-200 flex flex-col bg-zinc-50/40 ${selectedEmailId ? 'hidden lg:flex' : 'flex'}`}>
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-400">
              <RefreshCw className="h-7 w-7 animate-spin text-red-600 mb-3" />
              <p className="text-xs font-medium text-zinc-600">Loading dispatched emails...</p>
            </div>
          ) : error && allSentList.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
              <p className="text-sm font-semibold text-zinc-800">Could not retrieve sent emails</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs">{error}</p>
              <button
                type="button"
                onClick={fetchSent}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-400">
              <div className="rounded-full bg-zinc-100 p-4 mb-3">
                <Send className="h-8 w-8 text-zinc-300" />
              </div>
              <p className="text-sm font-semibold text-zinc-700">No sent emails recorded</p>
              <p className="text-xs text-zinc-500 max-w-xs mt-1">
                {searchQuery
                  ? 'No sent messages matched your search query.'
                  : 'Emails sent using the Compose tab will appear here.'}
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
              {filteredEmails.map((email) => {
                const isSelected = email.id === selectedEmailId;
                const statusColor =
                  email.lastEvent === 'delivered'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : email.lastEvent === 'failed'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-zinc-100 text-zinc-700 border-zinc-200';

                return (
                  <button
                    key={email.id}
                    type="button"
                    onClick={() => setSelectedEmailId(email.id)}
                    className={`w-full text-left p-3.5 transition-all flex flex-col gap-1 cursor-pointer border-l-4 ${
                      isSelected
                        ? 'bg-red-50/70 border-red-600 shadow-2xs'
                        : 'border-transparent hover:bg-white hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-semibold truncate ${isSelected ? 'text-red-950' : 'text-zinc-900'}`}>
                        To: {email.to}
                      </span>
                      <span className="text-[11px] font-medium text-zinc-600 shrink-0">
                        {formatDate(email.createdAt)}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-zinc-800 truncate">
                      {email.subject}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-[11px] text-zinc-600 truncate font-mono">
                        From: {email.from}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold border rounded-full px-2 py-0.5 capitalize ${statusColor}`}>
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        {email.lastEvent || 'sent'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected Email Reader */}
        <div className={`lg:col-span-7 xl:col-span-8 flex flex-col bg-white overflow-hidden ${!selectedEmailId ? 'hidden lg:flex' : 'flex'}`}>
          {!selectedEmailId ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-400">
              <Mail className="h-10 w-10 text-zinc-200 mb-2" />
              <p className="text-sm font-semibold text-zinc-600">Select a sent email to view</p>
              <p className="text-xs text-zinc-400 max-w-xs mt-1">
                Choose an email from the list on the left to inspect its details and content.
              </p>
            </div>
          ) : isLoadingDetail ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-400">
              <RefreshCw className="h-8 w-8 animate-spin text-red-600 mb-3" />
              <p className="text-xs font-medium text-zinc-600">Loading email details...</p>
            </div>
          ) : selectedDetail ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Email Reader Header */}
              <div className="border-b border-zinc-200 p-3.5 sm:p-5 bg-white">
                {/* Mobile back button */}
                <button
                  type="button"
                  onClick={() => setSelectedEmailId(null)}
                  className="lg:hidden mb-3 inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:text-zinc-900 transition-colors cursor-pointer"
                >
                  <span>← Back to Sent</span>
                </button>

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight leading-snug break-words">
                        {selectedDetail.subject || '(No Subject)'}
                      </h3>
                      {selectedDetail.last_event && (
                        <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold border rounded-full px-2 sm:px-2.5 py-0.5 capitalize bg-emerald-50 text-emerald-700 border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" />
                          {selectedDetail.last_event}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 space-y-1 text-xs">
                      <div className="flex items-center gap-2 text-zinc-700">
                        <span className="font-semibold text-zinc-500 w-12 sm:w-14 shrink-0">To:</span>
                        <span className="font-mono text-zinc-900 break-all">{selectedDetail.to?.join(', ')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-600">
                        <span className="font-semibold text-zinc-500 w-12 sm:w-14 shrink-0">From:</span>
                        <span className="font-medium text-zinc-800 break-all">{selectedDetail.from}</span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-500">
                        <span className="font-semibold text-zinc-500 w-12 sm:w-14 shrink-0">Sent:</span>
                        <span className="text-[11px] sm:text-xs">{new Date(selectedDetail.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Reuse & Copy ID */}
                  <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                    <button
                      type="button"
                      onClick={() =>
                        onReuse({
                          to: selectedDetail.to?.[0] || '',
                          subject: selectedDetail.subject || '',
                          html: selectedDetail.html || '',
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-red-700 transition-colors cursor-pointer"
                      title="Load into Composer as draft"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Reuse as Draft</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy(selectedDetail.id, selectedDetail.id)}
                      className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 shadow-2xs hover:bg-zinc-50 hover:text-zinc-900 transition-colors cursor-pointer"
                      title="Copy Resend Email ID"
                    >
                      {copiedId === selectedDetail.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-emerald-700 text-[11px]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-zinc-400" />
                          <span className="text-[11px]">ID</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* View Format Selector (HTML vs Plain Text) */}
                <div className="flex items-center justify-between border-t border-zinc-100 mt-4 pt-3">
                  <div className="flex items-center gap-1.5 bg-zinc-100/80 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setViewFormat('html')}
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                        viewFormat === 'html'
                          ? 'bg-white text-zinc-900 shadow-2xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      <Code className="h-3 w-3" />
                      HTML Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewFormat('text')}
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                        viewFormat === 'text'
                          ? 'bg-white text-zinc-900 shadow-2xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      <FileText className="h-3 w-3" />
                      Plain Text
                    </button>
                  </div>
                </div>
              </div>

              {/* Email Content Body */}
              <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/50">
                {viewFormat === 'html' && selectedDetail.html ? (
                  <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
                    <iframe
                      srcDoc={selectedDetail.html}
                      title="Sent Email Preview"
                      className="w-full min-h-[460px] border-none"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-2xs font-mono text-xs text-zinc-800 whitespace-pre-wrap leading-relaxed">
                    {selectedDetail.text || selectedDetail.html?.replace(/<[^>]*>?/gm, '') || 'No plain text representation available.'}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
