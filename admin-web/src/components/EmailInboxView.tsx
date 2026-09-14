import React, { useState, useEffect, useCallback } from 'react';
import {
  Inbox,
  RefreshCw,
  Search,
  Reply,
  Mail,
  AlertCircle,
  Copy,
  Check,
  Paperclip,
  Code,
  FileText,
  ExternalLink,
} from 'lucide-react';
import type { ReceivedEmailSummary, ReceivedEmailDetail, ResendSettings } from '../types/email';
import { getReceivedEmails, getReceivedEmailDetail } from '../services/emailService';

interface EmailInboxViewProps {
  settings: ResendSettings;
  onReply: (replyData: { to: string; subject: string }) => void;
  onUpdateBadgeCount?: (count: number) => void;
}

export const EmailInboxView: React.FC<EmailInboxViewProps> = ({
  settings,
  onReply,
  onUpdateBadgeCount,
}) => {
  const [emails, setEmails] = useState<ReceivedEmailSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ReceivedEmailDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [viewFormat, setViewFormat] = useState<'html' | 'text'>('html');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchEmails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getReceivedEmails(settings);
      setEmails(data);
      if (onUpdateBadgeCount) {
        onUpdateBadgeCount(data.length);
      }
      // Auto-select first email on desktop ONLY (screen width >= 1024)
      if (data.length > 0 && !selectedEmailId && typeof window !== 'undefined' && window.innerWidth >= 1024) {
        setSelectedEmailId(data[0].id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load received emails';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [settings, onUpdateBadgeCount]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // Load detail whenever selectedEmailId changes
  useEffect(() => {
    if (!selectedEmailId) {
      setSelectedDetail(null);
      return;
    }

    let isMounted = true;
    const loadDetail = async () => {
      setIsLoadingDetail(true);
      try {
        const detail = await getReceivedEmailDetail(selectedEmailId, settings);
        if (isMounted) {
          setSelectedDetail(detail);
        }
      } catch (err) {
        console.error('Failed to load email details:', err);
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
  }, [selectedEmailId, settings]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
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

  // Helper to extract clean email from "Name <email@domain.com>" or "email@domain.com"
  const extractEmail = (fromStr: string) => {
    const match = fromStr.match(/<([^>]+)>/);
    return match ? match[1] : fromStr.trim();
  };

  const filteredEmails = emails.filter((item) => {
    const q = searchQuery.toLowerCase();
    const fromMatch = item.from?.toLowerCase().includes(q);
    const subjectMatch = item.subject?.toLowerCase().includes(q);
    const toMatch = item.to?.some((t) => t.toLowerCase().includes(q));
    return fromMatch || subjectMatch || toMatch;
  });

  return (
    <div className="flex-1 flex flex-col bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 px-3.5 sm:px-5 py-3 sm:py-3.5 bg-zinc-50/70">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-red-50 text-red-600 ring-1 ring-red-200/60 shadow-2xs shrink-0">
            <Inbox className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 truncate">Received Emails (Inbox)</h2>
              <span className="rounded-full bg-red-100 px-2 py-0.2 text-[10px] sm:text-xs font-bold text-red-700">
                {emails.length}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-zinc-500 truncate">
              support@arkclinicwarri.com
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search Bar */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sender, subject..."
              className="h-8.5 w-full sm:w-64 rounded-lg border border-zinc-200 bg-white pl-8 pr-3 text-xs text-zinc-800 placeholder-zinc-400 focus:border-red-500 focus:outline-hidden focus:ring-1 focus:ring-red-500/20"
            />
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchEmails}
            disabled={isLoading}
            className="inline-flex h-8.5 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 sm:px-3 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:text-zinc-900 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            title="Refresh Inbox"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-red-600' : 'text-zinc-500'}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Content Area: Split List & Reader Pane */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-[500px] sm:min-h-[620px] overflow-hidden">
        {/* Left Column: List of Messages */}
        <div className={`lg:col-span-5 xl:col-span-4 border-r border-zinc-200 flex flex-col bg-zinc-50/40 ${selectedEmailId ? 'hidden lg:flex' : 'flex'}`}>
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-400">
              <RefreshCw className="h-7 w-7 animate-spin text-red-600 mb-3" />
              <p className="text-xs font-medium text-zinc-600">Checking for incoming emails...</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
              <p className="text-sm font-semibold text-zinc-800">Could not retrieve emails</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs">{error}</p>
              <button
                type="button"
                onClick={fetchEmails}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-400">
              <div className="rounded-full bg-zinc-100 p-4 mb-3">
                <Inbox className="h-8 w-8 text-zinc-300" />
              </div>
              <p className="text-sm font-semibold text-zinc-700">No emails found</p>
              <p className="text-xs text-zinc-500 max-w-xs mt-1">
                {searchQuery
                  ? 'No incoming messages matched your search query.'
                  : 'Emails sent to support@arkclinicwarri.com will automatically arrive here.'}
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
              {filteredEmails.map((email) => {
                const isSelected = email.id === selectedEmailId;
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
                        {email.from}
                      </span>
                      <span className="text-[11px] font-medium text-zinc-600 shrink-0">
                        {formatDate(email.created_at)}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-zinc-800 truncate">
                      {email.subject || '(No Subject)'}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-[11px] text-zinc-600 truncate font-mono">
                        To: {email.to?.join(', ')}
                      </span>
                      {email.attachments && email.attachments.length > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-zinc-500 bg-zinc-100 rounded px-1.5 py-0.5">
                          <Paperclip className="h-2.5 w-2.5" />
                          {email.attachments.length}
                        </span>
                      )}
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
              <p className="text-sm font-semibold text-zinc-600">Select an email to view</p>
              <p className="text-xs text-zinc-400 max-w-xs mt-1">
                Choose a message from the list on the left to read its complete content.
              </p>
            </div>
          ) : isLoadingDetail ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-400">
              <RefreshCw className="h-8 w-8 animate-spin text-red-600 mb-3" />
              <p className="text-xs font-medium text-zinc-600">Loading email content...</p>
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
                  <span>← Back to Inbox</span>
                </button>

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight leading-snug break-words">
                      {selectedDetail.subject || '(No Subject)'}
                    </h3>

                    <div className="mt-2 space-y-1 text-xs">
                      <div className="flex items-center gap-2 text-zinc-700">
                        <span className="font-semibold text-zinc-500 w-12 sm:w-14 shrink-0">From:</span>
                        <span className="font-medium text-zinc-900 break-all">{selectedDetail.from}</span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-600">
                        <span className="font-semibold text-zinc-500 w-12 sm:w-14 shrink-0">To:</span>
                        <span className="font-mono text-zinc-800 break-all">{selectedDetail.to?.join(', ')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-500">
                        <span className="font-semibold text-zinc-500 w-12 sm:w-14 shrink-0">Date:</span>
                        <span className="text-[11px] sm:text-xs">{new Date(selectedDetail.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Reply & Copy ID */}
                  <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                    <button
                      type="button"
                      onClick={() =>
                        onReply({
                          to: extractEmail(selectedDetail.from),
                          subject: selectedDetail.subject?.startsWith('Re:')
                            ? selectedDetail.subject
                            : `Re: ${selectedDetail.subject || 'Message'}`,
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-red-700 transition-colors cursor-pointer"
                    >
                      <Reply className="h-3.5 w-3.5" />
                      <span>Reply</span>
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
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 mt-3.5 pt-3">
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
                      HTML View
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

                  {selectedDetail.raw?.download_url && (
                    <a
                      href={selectedDetail.raw.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-red-600 transition-colors"
                      download
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>Download .eml</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Email Content Body */}
              <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 bg-zinc-50/50">
                {viewFormat === 'html' && selectedDetail.html ? (
                  <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-2xs min-h-[300px]">
                    <div
                      className="prose prose-sm max-w-none text-zinc-800"
                      dangerouslySetInnerHTML={{ __html: selectedDetail.html }}
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-2xs font-mono text-xs text-zinc-800 whitespace-pre-wrap leading-relaxed">
                    {selectedDetail.text || 'No text representation available for this email.'}
                  </div>
                )}

                {/* Attachments Section if any */}
                {selectedDetail.attachments && selectedDetail.attachments.length > 0 && (
                  <div className="mt-5 rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs">
                    <h4 className="text-xs font-bold text-zinc-900 mb-2 flex items-center gap-1.5">
                      <Paperclip className="h-3.5 w-3.5 text-zinc-500" />
                      Attachments ({selectedDetail.attachments.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedDetail.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 text-xs"
                        >
                          <span className="truncate font-medium text-zinc-800">{att.filename}</span>
                          <span className="text-[10px] text-zinc-600 shrink-0 font-mono">
                            {Math.round(att.size / 1024)} KB
                          </span>
                        </div>
                      ))}
                    </div>
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
