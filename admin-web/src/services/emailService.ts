import type {
  EmailPayload,
  ResendSettings,
  SendEmailResponse,
  SentEmailRecord,
  ReceivedEmailSummary,
  ReceivedEmailDetail,
  ReceivedEmailAttachment,
  ResendSentEmail,
} from '../types/email';

const STORAGE_KEYS = {
  API_KEY: 'redapple_resend_api_key',
  SETTINGS: 'redapple_resend_settings',
  SENT_HISTORY: 'redapple_sent_emails',
  DRAFT: 'redapple_email_draft',
};

export const DEFAULT_SETTINGS: ResendSettings = {
  apiKey: '',
  defaultSenderName: 'Red Apple Health',
  defaultSenderEmail: 'notifications@arkclinicwarri.com',
  replyTo: 'support@arkclinicwarri.com',
  deliveryMode: 'vite-proxy',
};

/**
 * Retrieve saved Resend configuration
 */
export function getResendSettings(): ResendSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const envKey = (import.meta as { env?: Record<string, string> }).env?.VITE_RESEND_API_KEY || '';
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ResendSettings>;
      const senderEmail =
        !parsed.defaultSenderEmail || parsed.defaultSenderEmail === 'onboarding@resend.dev'
          ? 'notifications@arkclinicwarri.com'
          : parsed.defaultSenderEmail;
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        defaultSenderEmail: senderEmail,
        apiKey: envKey || parsed.apiKey || '',
      };
    }
    return {
      ...DEFAULT_SETTINGS,
      apiKey: envKey,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save updated Resend configuration
 */
export function saveResendSettings(settings: ResendSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    if (settings.apiKey) {
      localStorage.setItem(STORAGE_KEYS.API_KEY, settings.apiKey);
    }
  } catch (err) {
    console.error('Failed to save Resend settings to localStorage', err);
  }
}

/**
 * Save email draft to local storage
 */
export function saveEmailDraft(draft: {
  to: string;
  subject: string;
  html: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
}): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify(draft));
  } catch (err) {
    console.error('Failed to save email draft', err);
  }
}

/**
 * Load email draft from local storage
 */
export function loadEmailDraft(): {
  to: string;
  subject: string;
  html: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
} | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DRAFT);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.html && parsed.html.includes('🍎')) {
      localStorage.removeItem(STORAGE_KEYS.DRAFT);
      return null;
    }
    if (parsed.fromEmail === 'onboarding@resend.dev' || !parsed.fromEmail) {
      parsed.fromEmail = 'notifications@arkclinicwarri.com';
    }
    if (parsed.replyTo === 'support@redapple.health' || !parsed.replyTo) {
      parsed.replyTo = 'support@arkclinicwarri.com';
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Retrieve sent emails history
 */
export function getSentHistory(): SentEmailRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SENT_HISTORY);
    return raw ? (JSON.parse(raw) as SentEmailRecord[]) : [];
  } catch {
    return [];
  }
}

/**
 * Append a sent email to history
 */
export function recordSentEmail(record: SentEmailRecord): void {
  try {
    const history = getSentHistory();
    const updated = [record, ...history].slice(0, 50); // Keep last 50
    localStorage.setItem(STORAGE_KEYS.SENT_HISTORY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to record sent email', err);
  }
}

/**
 * Clear sent email history
 */
export function clearSentHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.SENT_HISTORY);
  } catch (err) {
    console.error('Failed to clear sent history', err);
  }
}


/**
 * Sends an email using the configured delivery strategy:
 * 1. Vite Proxy (/api/resend/emails) - works natively in dev server without CORS
 * 2. Express Backend (/api/emails/send) - if backend server is available
 * 3. Direct Resend REST API fallback (https://api.resend.com/emails)
 */
export async function sendEmailViaResend(
  payload: EmailPayload,
  settings: ResendSettings
): Promise<SendEmailResponse> {
  const apiKey = settings.apiKey?.trim();

  if (!apiKey) {
    throw new Error('Missing Resend API Key. Please configure your API key in the top settings modal.');
  }

  const recipients = Array.isArray(payload.to)
    ? payload.to.map((e) => e.trim()).filter(Boolean)
    : payload.to
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);

  if (recipients.length === 0) {
    throw new Error('Please provide at least one valid recipient email address.');
  }

  const emailBody: Record<string, unknown> = {
    from: payload.from,
    to: recipients,
    subject: payload.subject,
    html: payload.html,
  };

  if (payload.text) emailBody.text = payload.text;
  if (payload.replyTo) emailBody.reply_to = payload.replyTo;
  if (payload.cc) {
    const ccList = Array.isArray(payload.cc) ? payload.cc : payload.cc.split(',').map((e) => e.trim()).filter(Boolean);
    if (ccList.length > 0) emailBody.cc = ccList;
  }
  if (payload.bcc) {
    const bccList = Array.isArray(payload.bcc) ? payload.bcc : payload.bcc.split(',').map((e) => e.trim()).filter(Boolean);
    if (bccList.length > 0) emailBody.bcc = bccList;
  }

  // Strategy determination
  const endpoints: { url: string; mode: string }[] = [];
  if (settings.deliveryMode === 'vite-proxy') {
    endpoints.push({ url: '/api/resend/emails', mode: 'vite-proxy' });
    endpoints.push({ url: 'https://api.resend.com/emails', mode: 'direct' });
  } else if (settings.deliveryMode === 'backend') {
    endpoints.push({ url: '/api/emails/send', mode: 'backend' });
    endpoints.push({ url: '/api/resend/emails', mode: 'vite-proxy' });
  } else {
    endpoints.push({ url: 'https://api.resend.com/emails', mode: 'direct' });
    endpoints.push({ url: '/api/resend/emails', mode: 'vite-proxy' });
  }

  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    try {
      const isBackend = endpoint.mode === 'backend';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (!isBackend) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else {
        headers['x-resend-api-key'] = apiKey;
      }

      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(emailBody),
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        let errorMessage = responseData?.message || responseData?.error || `HTTP ${response.status} ${response.statusText}`;

        if (response.status === 401) {
          errorMessage = 'Unauthorized: Invalid Resend API Key. Please verify your key at resend.com/api-keys.';
        } else if (response.status === 403) {
          errorMessage =
            'Resend Restriction: Because your custom domain is not verified yet, Resend only allows sending to the email address you signed up with on Resend. Enter your Resend account email in "Send To" to test, or verify your domain at resend.com/domains.';
        } else if (response.status === 422) {
          errorMessage = `Validation Failed: ${errorMessage}. Check the sender address domain and recipient email format.`;
        }

        throw new Error(errorMessage);
      }

      const result: SendEmailResponse = {
        id: responseData?.id || `resend_${Date.now()}`,
        from: payload.from,
        to: recipients,
        created_at: new Date().toISOString(),
      };

      // Record to history
      recordSentEmail({
        id: `sent_${Date.now()}`,
        resendId: result.id || 'N/A',
        to: recipients.join(', '),
        from: payload.from,
        subject: payload.subject,
        html: payload.html,
        sentAt: new Date().toISOString(),
        status: 'sent',
      });

      return result;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // If it's an explicit 401/403/422 from Resend, don't keep falling back to avoid duplicate confusion
      if (
        lastError.message.includes('Invalid Resend API Key') ||
        lastError.message.includes('Resend Domain Restriction') ||
        lastError.message.includes('Validation Failed')
      ) {
        break;
      }
    }
  }

  // If failed, record to sent history as failed
  recordSentEmail({
    id: `failed_${Date.now()}`,
    resendId: 'failed',
    to: recipients.join(', '),
    from: payload.from,
    subject: payload.subject,
    html: payload.html,
    sentAt: new Date().toISOString(),
    status: 'failed',
    errorMessage: lastError?.message || 'Unknown network failure',
  });

  throw lastError || new Error('Failed to dispatch email via Resend API.');
}

/**
 * Generic GET helper to query Resend endpoints via Proxy or Direct
 */
async function fetchResendGet<T>(path: string, customSettings?: ResendSettings): Promise<T> {
  const currentSettings = customSettings || getResendSettings();
  const apiKey = currentSettings.apiKey?.trim();

  if (!apiKey) {
    throw new Error('Resend API key is missing. Please configure it in .env.local or settings.');
  }

  const endpoints = [
    `/api/resend${path}`,
    `https://api.resend.com${path}`,
  ];

  let lastError: Error | null = null;

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.message || `HTTP ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error(`Failed to fetch from Resend at ${path}`);
}

/**
 * Fetch received (inbound) emails list
 */
export async function getReceivedEmails(settings?: ResendSettings): Promise<ReceivedEmailSummary[]> {
  try {
    const result = await fetchResendGet<{ data: ReceivedEmailSummary[] }>('/emails/receiving', settings);
    return Array.isArray(result.data) ? result.data : [];
  } catch (error) {
    console.error('Error fetching received emails:', error);
    throw error;
  }
}

/**
 * Fetch a single received email with full HTML/text body and enriched attachment download URLs
 */
export async function getReceivedEmailDetail(id: string, settings?: ResendSettings): Promise<ReceivedEmailDetail> {
  try {
    const detail = await fetchResendGet<ReceivedEmailDetail>(
      `/emails/receiving/${encodeURIComponent(id)}`,
      settings
    );

    // If the email has attachments, fetch the signed download_url for each attachment from Resend's Attachments API
    if (detail.attachments && detail.attachments.length > 0) {
      try {
        const enrichedAttachments = await getReceivedEmailAttachments(id, settings);
        if (enrichedAttachments.length > 0) {
          const urlMap = new Map(enrichedAttachments.map((a) => [a.id, a]));
          detail.attachments = detail.attachments.map((att) => {
            const enriched = urlMap.get(att.id);
            return enriched ? { ...att, ...enriched } : att;
          });
        }
      } catch (attErr) {
        console.warn(`Could not pre-fetch attachment download URLs for email ${id}:`, attErr);
      }
    }

    return detail;
  } catch (error) {
    console.error(`Error fetching received email detail for ${id}:`, error);
    throw error;
  }
}

/**
 * Fetch all attachments (including signed download_url) for a specific received email
 */
export async function getReceivedEmailAttachments(
  emailId: string,
  settings?: ResendSettings
): Promise<ReceivedEmailAttachment[]> {
  try {
    const result = await fetchResendGet<{ data: ReceivedEmailAttachment[] }>(
      `/emails/receiving/${encodeURIComponent(emailId)}/attachments`,
      settings
    );
    return Array.isArray(result.data) ? result.data : [];
  } catch (error) {
    console.error(`Error fetching attachments for received email ${emailId}:`, error);
    throw error;
  }
}

/**
 * Fetch a single attachment (with fresh signed download_url) for a received email
 */
export async function getReceivedEmailAttachment(
  emailId: string,
  attachmentId: string,
  settings?: ResendSettings
): Promise<ReceivedEmailAttachment> {
  try {
    return await fetchResendGet<ReceivedEmailAttachment>(
      `/emails/receiving/${encodeURIComponent(emailId)}/attachments/${encodeURIComponent(attachmentId)}`,
      settings
    );
  } catch (error) {
    console.error(`Error fetching attachment ${attachmentId} for email ${emailId}:`, error);
    throw error;
  }
}

/**
 * Fetch sent (outbound) emails directly from Resend
 */
export async function getResendSentEmails(settings?: ResendSettings): Promise<ResendSentEmail[]> {
  try {
    const result = await fetchResendGet<{ data: ResendSentEmail[] }>('/emails', settings);
    return Array.isArray(result.data) ? result.data : [];
  } catch (error) {
    console.error('Error fetching sent emails from Resend:', error);
    throw error;
  }
}

/**
 * Fetch a single sent email's details from Resend
 */
export async function getResendSentEmailDetail(id: string, settings?: ResendSettings): Promise<ResendSentEmail> {
  try {
    return await fetchResendGet<ResendSentEmail>(`/emails/${encodeURIComponent(id)}`, settings);
  } catch (error) {
    console.error(`Error fetching sent email detail for ${id}:`, error);
    throw error;
  }
}

