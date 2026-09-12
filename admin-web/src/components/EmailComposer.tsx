import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  RotateCcw,
  AlertCircle,
  Mail,
  ChevronDown,
  ChevronUp,
  FileText,
  Code2,
} from 'lucide-react';
import { buildEmailHtmlFromSimpleData } from '../utils/templateBuilder';
import type { ResendSettings } from '../types/email';

interface EmailComposerProps {
  to: string;
  setTo: (val: string) => void;
  fromName: string;
  setFromName: (val: string) => void;
  fromEmail: string;
  setFromEmail: (val: string) => void;
  replyTo: string;
  setReplyTo: (val: string) => void;
  subject: string;
  setSubject: (val: string) => void;
  html: string;
  setHtml: (val: string) => void;
  cc: string;
  setCc: (val: string) => void;
  bcc: string;
  setBcc: (val: string) => void;
  isSending: boolean;
  onSend: (isTestSend?: boolean) => void;
  onOpenSettings: () => void;
  settings: ResendSettings;
}

export const EmailComposer: React.FC<EmailComposerProps> = ({
  to,
  setTo,
  fromName,
  setFromName,
  fromEmail,
  setFromEmail,
  replyTo,
  setReplyTo,
  subject,
  setSubject,
  html,
  setHtml,
  cc,
  setCc,
  bcc,
  setBcc,
  isSending,
  onSend,
  onOpenSettings,
  settings,
}) => {
  // Mode: 'simple' (friendly non-tech writer) vs 'html' (raw HTML code)
  const [editorMode, setEditorMode] = useState<'simple' | 'html'>('simple');
  const [showSenderDetails, setShowSenderDetails] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Simple Form State for Non-Tech editing
  const [headline, setHeadline] = useState('Welcome to Red Apple Health! 👋');
  const [message, setMessage] = useState(
    'We are thrilled to welcome you to Red Apple. Our mission is to put world-class fertility insights, cycle tracking, pregnancy care, and telemedicine consultations directly at your fingertips.\n\nWhenever you need help or have questions regarding your care, our team is always just a message away.'
  );
  const [signoff, setSignoff] = useState('Warm regards,\nThe Red Apple Team');

  const rawHtmlTextareaRef = useRef<HTMLTextAreaElement>(null);
  const isKeyMissing = !settings.apiKey || settings.apiKey.trim().length === 0;

  // Whenever simple form fields change in 'simple' mode, compile HTML and update parent html state
  useEffect(() => {
    if (editorMode === 'simple') {
      const generated = buildEmailHtmlFromSimpleData({
        recipient: to,
        subject,
        headline,
        message,
        signoff,
      });
      setHtml(generated);
    }
  }, [editorMode, to, subject, headline, message, signoff, setHtml]);

  const handleReset = () => {
    if (window.confirm('Reset the email form to default?')) {
      setSubject('A message from Red Apple Health');
      setHeadline('Hello from Red Apple');
      setMessage('Type your message here naturally... You can write paragraphs or greetings.');
      setSignoff('Warm regards,\nThe Red Apple Team');
      setTo('');
      setCc('');
      setBcc('');
    }
  };

  const validateAndSubmit = (isTest = false) => {
    setValidationError(null);

    if (!to.trim()) {
      setValidationError('Please enter who you want to send this email to.');
      return;
    }

    if (!subject.trim()) {
      setValidationError('Please add a subject for this email.');
      return;
    }

    if (editorMode === 'simple' && !message.trim()) {
      setValidationError('Please write a message before sending.');
      return;
    }

    if (editorMode === 'html' && !html.trim()) {
      setValidationError('Email HTML content cannot be empty.');
      return;
    }

    if (isKeyMissing) {
      setValidationError('Please connect your Resend API Key before sending.');
      onOpenSettings();
      return;
    }

    onSend(isTest);
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white shadow-xs">
      {/* Top Composer Header */}
      <div className="border-b border-zinc-100 bg-white p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-base font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              <Mail className="h-4.5 w-4.5 text-red-600" />
              Write Email
            </h2>
            <p className="text-xs text-zinc-500">
              Type your message below. Red Apple formats and delivers it automatically.
            </p>
          </div>

          {/* Mode Switcher: Easy Form vs HTML Code */}
          <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
            <button
              type="button"
              onClick={() => setEditorMode('simple')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                editorMode === 'simple'
                  ? 'bg-white text-red-600 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Easy Writer
            </button>
            <button
              type="button"
              onClick={() => setEditorMode('html')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                editorMode === 'html'
                  ? 'bg-white text-red-600 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
              title="Switch to raw HTML code editor"
            >
              <Code2 className="h-3.5 w-3.5" />
              HTML Code
            </button>
          </div>
        </div>


        {/* Primary Inputs */}
        <div className="space-y-3">
          {/* Recipient Address */}
          <div>
            <label className="text-xs font-bold text-zinc-800 block mb-1">
              Send To (Recipient Email) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="e.g. patient@gmail.com, doctor@clinic.com"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-red-500 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 shadow-2xs"
            />
          </div>

          {/* Subject */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-zinc-800">
                Email Subject <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-zinc-400">{subject.length} characters</span>
            </div>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Welcome to Red Apple Health"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 focus:border-red-500 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 shadow-2xs"
            />
          </div>

          {/* Simplified Collapsible Sender Info */}
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-zinc-600 truncate">
                <span className="text-zinc-400 font-medium">From:</span>
                <span className="font-semibold text-zinc-800 truncate">{fromName}</span>
                <span className="text-zinc-500 text-[11px] font-mono truncate">&lt;{fromEmail}&gt;</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSenderDetails(!showSenderDetails)}
                className="inline-flex items-center gap-1 font-semibold text-red-600 hover:text-red-700 transition-colors ml-2 shrink-0 cursor-pointer"
              >
                {showSenderDetails ? (
                  <>
                    <span>Hide</span>
                    <ChevronUp className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    <span>Change Sender / CC</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>

            {showSenderDetails && (
              <div className="mt-3 pt-3 border-t border-zinc-200/80 space-y-3 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-700 block mb-1">Sender Name</label>
                    <input
                      type="text"
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      placeholder="Red Apple Health"
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-red-500 focus:outline-hidden focus:ring-1 focus:ring-red-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-700 block mb-1">Sender Email</label>
                    <input
                      type="text"
                      value={fromEmail}
                      onChange={(e) => setFromEmail(e.target.value)}
                      placeholder="notifications@arkclinicwarri.com"
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-red-500 focus:outline-hidden focus:ring-1 focus:ring-red-500/20 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-700 block mb-1">Reply-To Email</label>
                    <input
                      type="text"
                      value={replyTo}
                      onChange={(e) => setReplyTo(e.target.value)}
                      placeholder="support@arkclinicwarri.com"
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-red-500 focus:outline-hidden focus:ring-1 focus:ring-red-500/20 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-700 block mb-1">CC Email (Optional)</label>
                    <input
                      type="text"
                      value={cc}
                      onChange={(e) => setCc(e.target.value)}
                      placeholder="e.g. colleague@clinic.com"
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-red-500 focus:outline-hidden focus:ring-1 focus:ring-red-500/20 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-700 block mb-1">BCC Email (Optional)</label>
                    <input
                      type="text"
                      value={bcc}
                      onChange={(e) => setBcc(e.target.value)}
                      placeholder="e.g. archive@clinic.com"
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-red-500 focus:outline-hidden focus:ring-1 focus:ring-red-500/20 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4">
        {editorMode === 'simple' ? (
          /* ============================================================
             SIMPLE / NON-TECH FRIENDLY WRITER
             ============================================================ */
          <div className="space-y-4">
            {/* Email Headline */}
            <div>
              <label className="text-xs font-bold text-zinc-800 block mb-1">
                Main Heading
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Welcome to Red Apple Health! 👋"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-zinc-900 focus:border-red-500 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 shadow-2xs"
              />
            </div>

            {/* Main Message Body */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-zinc-800">
                  Your Message <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-zinc-400">
                  Newlines automatically format into paragraphs
                </span>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here naturally... You can write paragraphs, lists (- item), or greetings."
                className="w-full min-h-[220px] rounded-xl border border-zinc-200 bg-white p-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-red-500 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 leading-relaxed shadow-2xs resize-none"
              />
            </div>

            {/* Sign-off */}
            <div>
              <label className="text-xs font-bold text-zinc-800 block mb-1">
                Closing / Sign-off
              </label>
              <input
                type="text"
                value={signoff}
                onChange={(e) => setSignoff(e.target.value)}
                placeholder="e.g. Warm regards, The Red Apple Team"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 focus:border-red-500 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 shadow-2xs"
              />
            </div>
          </div>
        ) : (
          /* ============================================================
             ADVANCED HTML CODE EDITOR
             ============================================================ */
          <div className="h-full flex flex-col space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span className="font-semibold text-zinc-700">Raw HTML Markup:</span>
              <span>Edit email code directly</span>
            </div>
            <textarea
              ref={rawHtmlTextareaRef}
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              placeholder="<html><body>...</body></html>"
              className="w-full min-h-[360px] flex-1 resize-none rounded-xl border border-zinc-300 bg-zinc-900 p-4 font-mono text-xs text-zinc-200 focus:border-red-500 focus:outline-hidden leading-relaxed shadow-inner"
              spellCheck={false}
            />
          </div>
        )}
      </div>

      {/* Validation Error Banner */}
      {validationError && (
        <div className="mx-4 mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2.5">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-600" />
          <span className="font-medium">{validationError}</span>
        </div>
      )}

      {/* Bottom Actions Bar */}
      <div className="border-t border-zinc-100 bg-white p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors shadow-2xs cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 text-zinc-400" />
            Reset
          </button>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {/* Test Send Button */}
          <button
            type="button"
            disabled={isSending}
            onClick={() => validateAndSubmit(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:border-zinc-300 disabled:opacity-50 transition-all cursor-pointer"
            title="Dispatch a test email to your own address"
          >
            Send Test to Me
          </button>

          {/* Primary Send Button */}
          <button
            type="button"
            disabled={isSending}
            onClick={() => validateAndSubmit(false)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
          >
            {isSending ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Send Email</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
