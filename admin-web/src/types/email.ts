export interface EmailPayload {
  to: string | string[];
  from: string;
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

export interface SendEmailResponse {
  id?: string;
  from?: string;
  to?: string[];
  created_at?: string;
  error?: {
    message: string;
    name?: string;
    statusCode?: number;
  };
}

export interface SimpleEmailData {
  recipient: string;
  subject: string;
  headline: string;
  message: string;
  signoff: string;
}

export type TemplateCategory = 'onboarding' | 'clinical' | 'educational' | 'broadcast' | 'custom';

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  subject: string;
  html: string;
  simpleData?: Partial<SimpleEmailData>;
}

export interface SentEmailRecord {
  id: string;
  resendId: string;
  to: string;
  from: string;
  subject: string;
  html: string;
  sentAt: string;
  status: 'sent' | 'failed';
  errorMessage?: string;
}

export interface ResendSettings {
  apiKey: string;
  defaultSenderName: string;
  defaultSenderEmail: string;
  replyTo?: string;
  deliveryMode: 'vite-proxy' | 'direct' | 'backend';
}

export interface ReceivedEmailAttachment {
  id: string;
  filename: string;
  size: number;
  content_type: string;
  content_id?: string;
  content_disposition?: string;
  download_url?: string;
  expires_at?: string;
}

export interface ReceivedEmailSummary {
  id: string;
  to: string[];
  from: string;
  created_at: string;
  subject: string;
  bcc?: string[];
  cc?: string[];
  reply_to?: string[];
  message_id?: string;
  attachments?: ReceivedEmailAttachment[];
}

export interface ReceivedEmailDetail extends ReceivedEmailSummary {
  html?: string;
  text?: string;
  html_format?: string;
  headers?: Record<string, string>;
  raw?: {
    download_url?: string;
    expires_at?: string;
  };
}

export interface ResendSentEmail {
  id: string;
  to: string[];
  from: string;
  created_at: string;
  subject: string;
  bcc?: string[] | null;
  cc?: string[] | null;
  reply_to?: string[] | null;
  last_event?: string;
  scheduled_at?: string | null;
  message_id?: string;
  html?: string;
  text?: string;
}

