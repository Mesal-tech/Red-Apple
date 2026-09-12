import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { EmailComposer } from './components/EmailComposer';
import { EmailPreview } from './components/EmailPreview';
import { ApiKeyModal } from './components/ApiKeyModal';
import { SentHistoryModal } from './components/SentHistoryModal';
import { ToastNotification, type ToastData } from './components/ToastNotification';
import { buildEmailHtmlFromSimpleData } from './utils/templateBuilder';
import {
  getResendSettings,
  saveResendSettings,
  getSentHistory,
  clearSentHistory,
  sendEmailViaResend,
  saveEmailDraft,
  loadEmailDraft,
} from './services/emailService';
import type { ResendSettings, SentEmailRecord } from './types/email';
import { Edit3, Eye } from 'lucide-react';

export function App() {
  // Settings
  const [settings, setSettings] = useState<ResendSettings>(getResendSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // History & Modals
  const [sentHistory, setSentHistory] = useState<SentEmailRecord[]>(getSentHistory);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastData[]>([]);

  // Email Composer Form State
  const draft = loadEmailDraft();
  const initialSubject = draft?.subject || 'Welcome to Red Apple Health';

  const [to, setTo] = useState<string>(draft?.to || '');
  const [fromName, setFromName] = useState<string>(draft?.fromName || settings.defaultSenderName || 'Red Apple Health');
  const [fromEmail, setFromEmail] = useState<string>(
    draft?.fromEmail && draft.fromEmail !== 'onboarding@resend.dev'
      ? draft.fromEmail
      : settings.defaultSenderEmail || 'notifications@arkclinicwarri.com'
  );
  const [replyTo, setReplyTo] = useState<string>(
    draft?.replyTo && draft.replyTo !== 'support@redapple.health'
      ? draft.replyTo
      : settings.replyTo || 'support@arkclinicwarri.com'
  );
  const [subject, setSubject] = useState<string>(initialSubject);
  const [html, setHtml] = useState<string>(
    draft?.html ||
      buildEmailHtmlFromSimpleData({
        recipient: draft?.to || '',
        subject: initialSubject,
        headline: 'Welcome to Red Apple Health! 👋',
        message:
          'We are thrilled to welcome you to Red Apple. Our mission is to put world-class fertility insights, cycle tracking, pregnancy care, and telemedicine consultations directly at your fingertips.\n\nWhenever you need help or have questions regarding your care, our team is always just a message away.',
        signoff: 'Warm regards,\nThe Red Apple Team',
      })
  );
  const [cc, setCc] = useState<string>('');
  const [bcc, setBcc] = useState<string>('');

  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'composer' | 'preview'>('composer');


  // Debounced auto-save draft
  useEffect(() => {
    const timer = setTimeout(() => {
      saveEmailDraft({ to, subject, html, fromName, fromEmail, replyTo });
    }, 1000);
    return () => clearTimeout(timer);
  }, [to, subject, html, fromName, fromEmail, replyTo]);

  // Toast Helper
  const addToast = (type: 'success' | 'error' | 'info', title: string, message: string, resendId?: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    setToasts((prev) => [...prev, { id, type, title, message, resendId }]);

    // Auto-dismiss success after 6s, errors stay longer
    const timeout = type === 'success' ? 6000 : 10000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, timeout);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Handle Save Settings
  const handleSaveSettings = (newSettings: ResendSettings) => {
    saveResendSettings(newSettings);
    setSettings(newSettings);
    if (newSettings.defaultSenderName) setFromName(newSettings.defaultSenderName);
    if (newSettings.defaultSenderEmail) setFromEmail(newSettings.defaultSenderEmail);
    if (newSettings.replyTo) setReplyTo(newSettings.replyTo);
    addToast('success', 'Settings Saved', 'Resend API configurations have been updated.');
  };

  // Handle Clear Sent History
  const handleClearHistory = () => {
    if (window.confirm('Clear all sent email records from this browser?')) {
      clearSentHistory();
      setSentHistory([]);
      addToast('info', 'History Cleared', 'Sent email logs have been reset.');
    }
  };

  // Load Record into Composer
  const handleSelectRecord = (record: SentEmailRecord) => {
    setTo(record.to);
    setSubject(record.subject);
    setHtml(record.html);
    if (record.from) {
      const match = record.from.match(/(.*)<(.*)>/);
      if (match) {
        setFromName(match[1].trim());
        setFromEmail(match[2].trim());
      } else {
        setFromEmail(record.from);
      }
    }
    setActiveTab('composer');
    addToast('info', 'Loaded from History', `Draft loaded: "${record.subject}"`);
  };

  // Dispatch Email
  const handleSendEmail = useCallback(
    async (isTestSend = false) => {
      if (isSending) return;

      const recipient = isTestSend
        ? prompt('Enter test recipient email address (defaults to sender):', fromEmail) || fromEmail
        : to;

      if (!recipient || !recipient.trim()) {
        addToast('error', 'Recipient Required', 'Please provide a valid destination email address.');
        return;
      }

      setIsSending(true);

      const formattedFrom = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

      try {
        const response = await sendEmailViaResend(
          {
            to: recipient,
            from: formattedFrom,
            subject: isTestSend ? `[TEST] ${subject}` : subject,
            html,
            cc: cc.trim() ? cc : undefined,
            bcc: bcc.trim() ? bcc : undefined,
            replyTo: replyTo.trim() ? replyTo : undefined,
          },
          settings
        );

        // Refresh sent history
        setSentHistory(getSentHistory());

        addToast(
          'success',
          isTestSend ? 'Test Email Dispatched!' : 'Email Sent Successfully!',
          `Delivered to ${recipient} via Resend.`,
          response.id
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        addToast('error', 'Email Dispatch Failed', message);
      } finally {
        setIsSending(false);
      }
    },
    [isSending, to, fromName, fromEmail, subject, html, cc, bcc, replyTo, settings]
  );

  // Global keyboard shortcut: Ctrl+Enter or Cmd+Enter to send
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSendEmail(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSendEmail]);

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col selection:bg-red-500 selection:text-white">
      {/* Header */}
      <Header
        historyCount={sentHistory.length}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      {/* Main Workspace */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 flex flex-col">
        {/* Mobile Tab Switcher */}
        <div className="lg:hidden flex items-center justify-center mb-4">
          <div className="flex w-full max-w-xs rounded-xl border border-zinc-200 bg-white p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('composer')}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'composer'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Edit3 className="h-3.5 w-3.5" />
              Editor
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'preview'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </button>
          </div>
        </div>

        {/* Dual Split Workspace on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-stretch">
          {/* Left Column: Email Composer */}
          <div
            className={`lg:col-span-6 xl:col-span-7 flex flex-col ${
              activeTab === 'composer' ? 'block' : 'hidden lg:flex'
            }`}
          >
            <EmailComposer
              to={to}
              setTo={setTo}
              fromName={fromName}
              setFromName={setFromName}
              fromEmail={fromEmail}
              setFromEmail={setFromEmail}
              replyTo={replyTo}
              setReplyTo={setReplyTo}
              subject={subject}
              setSubject={setSubject}
              html={html}
              setHtml={setHtml}
              cc={cc}
              setCc={setCc}
              bcc={bcc}
              setBcc={setBcc}
              isSending={isSending}
              onSend={handleSendEmail}
              onOpenSettings={() => setIsSettingsOpen(true)}
              settings={settings}
            />
          </div>

          {/* Right Column: Live Responsive Preview */}
          <div
            className={`lg:col-span-6 xl:col-span-5 flex flex-col ${
              activeTab === 'preview' ? 'block' : 'hidden lg:flex'
            }`}
          >
            <EmailPreview
              fromName={fromName}
              fromEmail={fromEmail}
              to={to}
              subject={subject}
              html={html}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-3.5 mt-auto">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-2 px-4 sm:px-6 lg:px-8 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-800">Red Apple Admin</span>
            <span>&bull;</span>
            <span>Email Dispatch</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-zinc-400">
              Press <kbd className="rounded border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[10px] font-mono text-zinc-600">Ctrl</kbd> + <kbd className="rounded border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[10px] font-mono text-zinc-600">Enter</kbd> to send
            </span>
          </div>
        </div>
      </footer>

      {/* Modals & Toasts */}
      <ApiKeyModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />

      <SentHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        records={sentHistory}
        onClear={handleClearHistory}
        onSelectRecord={handleSelectRecord}
      />

      <ToastNotification toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}

export default App;
