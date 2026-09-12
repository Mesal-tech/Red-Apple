import React, { useState } from 'react';
import { X, Key, Eye, EyeOff, ExternalLink, ShieldCheck, HelpCircle, Save } from 'lucide-react';
import type { ResendSettings } from '../types/email';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ResendSettings;
  onSave: (newSettings: ResendSettings) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [apiKey, setApiKey] = useState(settings.apiKey || '');
  const [senderName, setSenderName] = useState(settings.defaultSenderName || 'Red Apple Health');
  const [senderEmail, setSenderEmail] = useState(
    settings.defaultSenderEmail && settings.defaultSenderEmail !== 'onboarding@resend.dev'
      ? settings.defaultSenderEmail
      : 'notifications@arkclinicwarri.com'
  );
  const [replyTo, setReplyTo] = useState(
    settings.replyTo && settings.replyTo !== 'support@redapple.health'
      ? settings.replyTo
      : 'support@arkclinicwarri.com'
  );
  const [deliveryMode, setDeliveryMode] = useState<ResendSettings['deliveryMode']>(
    settings.deliveryMode || 'vite-proxy'
  );
  const [showKey, setShowKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      apiKey: apiKey.trim(),
      defaultSenderName: senderName.trim(),
      defaultSenderEmail: senderEmail.trim(),
      replyTo: replyTo.trim(),
      deliveryMode,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 transition-all">
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 ring-1 ring-red-200/80">
              <Key className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">Resend API Settings</h2>
              <p className="text-xs text-zinc-500">Configure credentials & sender information</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* API Key Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700">
                Resend API Key <span className="text-red-500">*</span>
              </label>
              <a
                href="https://resend.com/api-keys"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 hover:underline"
              >
                Get API Key <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="re_123456789_abcdef..."
                className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-red-500 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-500">
              Keys start with <code className="text-red-600 bg-red-50 px-1 py-0.5 rounded font-mono">re_</code>. Can be added here or in <code className="text-zinc-800 bg-zinc-100 px-1 py-0.5 rounded font-mono">.env.local</code> as <code className="text-red-600 bg-red-50 px-1 py-0.5 rounded font-mono">RESEND_API_KEY</code>.
            </p>
          </div>

          {/* Sender Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1.5">
                Default Sender Name
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Red Apple Health"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-red-500 focus:outline-hidden focus:ring-2 focus:ring-red-500/20"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1.5">
                Default Sender Email
              </label>
              <input
                type="text"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="notifications@arkclinicwarri.com"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-red-500 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 font-mono text-xs"
              />
            </div>
          </div>

          {/* Reply-To Email */}
          <div>
            <label className="text-xs font-semibold text-zinc-700 block mb-1.5">
              Reply-To Email Address
            </label>
            <input
              type="email"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
              placeholder="support@arkclinicwarri.com"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-red-500 focus:outline-hidden focus:ring-2 focus:ring-red-500/20"
            />
          </div>

          {/* Delivery Mode Selection */}
          <div className="pt-1">
            <label className="text-xs font-semibold text-zinc-700 block mb-1.5">
              API Dispatch Strategy
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDeliveryMode('vite-proxy')}
                className={`rounded-lg border px-2.5 py-2 text-center text-xs font-medium transition-all ${
                  deliveryMode === 'vite-proxy'
                    ? 'border-red-500 bg-red-50 text-red-700 font-semibold ring-1 ring-red-500/30'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                Vite Dev Proxy
              </button>
              <button
                type="button"
                onClick={() => setDeliveryMode('backend')}
                className={`rounded-lg border px-2.5 py-2 text-center text-xs font-medium transition-all ${
                  deliveryMode === 'backend'
                    ? 'border-red-500 bg-red-50 text-red-700 font-semibold ring-1 ring-red-500/30'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                Express Backend
              </button>
              <button
                type="button"
                onClick={() => setDeliveryMode('direct')}
                className={`rounded-lg border px-2.5 py-2 text-center text-xs font-medium transition-all ${
                  deliveryMode === 'direct'
                    ? 'border-red-500 bg-red-50 text-red-700 font-semibold ring-1 ring-red-500/30'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                Direct REST
              </button>
            </div>
          </div>

          {/* Resend Tip Card */}
          <div className="rounded-xl border border-red-100 bg-red-50/60 p-3 text-xs text-red-950 flex gap-2.5">
            <HelpCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-red-900">Resend Free Tier Note:</span>
              <p className="text-zinc-600 text-[11px] leading-relaxed">
                If using a fresh Resend test key without a custom domain, emails can only be sent to the email address you signed up with at Resend, using{' '}
                <code className="bg-white/80 px-1 py-0.5 rounded text-red-700 border border-red-200">onboarding@resend.dev</code>. To send to any external address, verify your domain in Resend.
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 active:bg-red-800 transition-colors"
            >
              {savedSuccess ? (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
