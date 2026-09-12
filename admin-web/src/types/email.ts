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
