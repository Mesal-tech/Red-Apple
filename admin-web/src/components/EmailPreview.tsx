import React, { useState, useMemo } from 'react';
import { Monitor, Smartphone, Code2, Eye, UserCheck } from 'lucide-react';
import { replaceVariables } from '../services/emailService';

interface EmailPreviewProps {
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  html: string;
}

const SAMPLE_VARIABLES: Record<string, string> = {
  name: 'Amara Okafor',
  doctor_name: 'Dr. Chidinma Eze',
  specialty: 'Obstetrics & Gynecology',
  appointment_date: 'Thursday, Sept 18',
  appointment_time: '10:30 AM WAT',
  booking_reference: 'RA-7829-NG',
  video_session_url: 'https://redapple.health/telemedicine/session/RA-7829-NG',
  app_url: 'https://redapple.health/app',
  article_url: 'https://redapple.health/library/fertility/follicular-phase',
  issue_number: '42',
  notice_title: 'Scheduled Telemedicine Core Upgrades',
  unsubscribe_url: 'https://redapple.health/unsubscribe',
};

export const EmailPreview: React.FC<EmailPreviewProps> = ({
  fromName,
  fromEmail,
  to,
  subject,
  html,
}) => {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [useSampleVars, setUseSampleVars] = useState(true);
  const [viewSource, setViewSource] = useState(false);

  const renderedSubject = useMemo(() => {
    return useSampleVars ? replaceVariables(subject, SAMPLE_VARIABLES) : subject;
  }, [subject, useSampleVars]);

  const renderedHtml = useMemo(() => {
    const raw = useSampleVars ? replaceVariables(html, SAMPLE_VARIABLES) : html;
    return raw;
  }, [html, useSampleVars]);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white shadow-xs overflow-hidden">
      {/* Top Preview Controls Bar */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50/70 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-600">
            Live Preview
          </span>
          <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-700">
            {device === 'desktop' ? 'Desktop 580px' : 'Mobile 375px'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Sample Variables Toggle */}
          <button
            type="button"
            onClick={() => setUseSampleVars(!useSampleVars)}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              useSampleVars
                ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
            title="Toggle sample recipient variable substitution"
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Fill Variables</span>
          </button>

          {/* HTML Source Toggle */}
          <button
            type="button"
            onClick={() => setViewSource(!viewSource)}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              viewSource
                ? 'bg-zinc-800 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
            title="View HTML Source Code"
          >
            {viewSource ? <Eye className="h-3.5 w-3.5" /> : <Code2 className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{viewSource ? 'Visual' : 'HTML'}</span>
          </button>

          {/* Device Toggles */}
          <div className="flex items-center rounded-lg border border-zinc-200 bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setDevice('desktop')}
              className={`rounded-md p-1.5 transition-colors ${
                device === 'desktop'
                  ? 'bg-red-500 text-white shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
              title="Desktop client preview"
            >
              <Monitor className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDevice('mobile')}
              className={`rounded-md p-1.5 transition-colors ${
                device === 'mobile'
                  ? 'bg-red-500 text-white shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
              title="Mobile client preview"
            >
              <Smartphone className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Email Client Header Information */}
      <div className="border-b border-zinc-100 bg-white px-5 py-3 space-y-1.5">
        <div className="flex items-baseline justify-between text-xs">
          <div className="font-semibold text-zinc-900 truncate">
            {renderedSubject || <span className="text-zinc-400 italic">No subject specified</span>}
          </div>
          <span className="text-[11px] text-zinc-400 shrink-0 font-mono">Today, 2:45 PM</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-600">
          <span className="font-semibold text-zinc-800 shrink-0">From:</span>
          <span className="truncate text-zinc-700">
            {fromName || 'Red Apple'} &lt;{fromEmail || 'onboarding@resend.dev'}&gt;
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-600">
          <span className="font-semibold text-zinc-800 shrink-0">To:</span>
          <span className="truncate text-zinc-700 font-mono text-[11px]">
            {to || <span className="text-zinc-400 italic">recipient@domain.com</span>}
          </span>
        </div>
      </div>

      {/* Email Body Stage */}
      <div className="flex-1 overflow-auto bg-zinc-100/70 p-4 sm:p-6 flex justify-center">
        {viewSource ? (
          <div className="w-full rounded-xl border border-zinc-300 bg-zinc-900 p-4 font-mono text-xs text-zinc-200 overflow-auto shadow-inner">
            <pre className="whitespace-pre-wrap break-words">{renderedHtml}</pre>
          </div>
        ) : (
          <div
            className={`transition-all duration-300 ${
              device === 'mobile'
                ? 'w-[375px] max-w-full rounded-2xl shadow-xl ring-8 ring-zinc-800/10 overflow-hidden bg-white my-auto'
                : 'w-full max-w-[620px] rounded-xl shadow-xs bg-white'
            }`}
            style={{ minHeight: device === 'mobile' ? '640px' : '520px' }}
          >
            {device === 'mobile' && (
              <div className="flex items-center justify-between bg-zinc-900 px-5 py-2 text-[11px] text-white">
                <span className="font-medium">9:41</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px]">5G</span>
                  <div className="h-2 w-4 rounded-xs border border-white p-0.5">
                    <div className="h-full w-full bg-white rounded-2xs" />
                  </div>
                </div>
              </div>
            )}

            <iframe
              title="Email Preview Container"
              srcDoc={renderedHtml}
              className="w-full border-none h-full"
              style={{
                minHeight: device === 'mobile' ? '600px' : '520px',
                display: 'block',
              }}
              sandbox="allow-same-origin"
            />
          </div>
        )}
      </div>
    </div>
  );
};
