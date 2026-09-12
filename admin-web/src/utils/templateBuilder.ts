import type { SimpleEmailData } from '../types/email';
import { RED_APPLE_LOGO_BASE64 } from '../assets/logoBase64';

/**
 * Converts plain text into clean email HTML paragraphs, bullet lists, and line breaks
 */
export function formatPlainTextToEmailHtml(text: string): string {
  if (!text) return '';

  // If text already has HTML tags like <p> or <div>, return as is
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return text;
  }

  const paragraphs = text.split(/\n\s*\n/);
  return paragraphs
    .map((para) => {
      const trimmed = para.trim();
      if (!trimmed) return '';

      // Check if it's a bullet list
      const lines = trimmed.split('\n');
      const isBulletList = lines.every((line) => /^\s*[-*•]\s+/.test(line));

      if (isBulletList) {
        const items = lines
          .map((line) => line.replace(/^\s*[-*•]\s+/, '').trim())
          .filter(Boolean)
          .map((item) => `<li style="margin-bottom: 8px;">${item}</li>`)
          .join('');
        return `<ul style="margin: 0 0 18px 0; padding-left: 22px; font-size: 15px; line-height: 1.6; color: #3f3f46;">${items}</ul>`;
      }

      // Convert single newlines inside paragraph to <br>
      const withBr = trimmed.replace(/\n/g, '<br>');
      return `<p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #3f3f46;">${withBr}</p>`;
    })
    .join('');
}

/**
 * Builds a complete, responsive, branded Red Apple email template from simple user inputs
 */
export function buildEmailHtmlFromSimpleData(data: SimpleEmailData): string {
  const formattedBody = formatPlainTextToEmailHtml(data.message);

  const headlineBlock = data.headline?.trim()
    ? `<h1 style="font-size: 22px; font-weight: 700; color: #18181b; margin: 0 0 16px; letter-spacing: -0.3px; line-height: 1.3;">
        ${data.headline}
      </h1>`
    : '';

  const signoffBlock = data.signoff?.trim()
    ? `<div style="margin-top: 24px; font-size: 14px; line-height: 1.5; color: #52525b;">
        ${data.signoff.replace(/\n/g, '<br>')}
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.subject || 'Red Apple Health'}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #18181b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fafafa; padding: 36px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; border: 1px solid #f4f4f5; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05); overflow: hidden;">
          <!-- Top Crimson Accent Bar -->
          <tr>
            <td style="background-color: #e52e2e; height: 5px; line-height: 5px; font-size: 1px;">&nbsp;</td>
          </tr>
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 32px 36px 20px; text-align: left;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="vertical-align: middle;">
                    <div style="background-color: #ffffff; border: 1px solid #fee2e2; width: 44px; height: 44px; border-radius: 12px; text-align: center; overflow: hidden; padding: 2px;">
                      <img src="${RED_APPLE_LOGO_BASE64}" alt="Red Apple" width="40" height="40" style="display: block; margin: 0 auto; object-fit: contain;" />
                    </div>
                  </td>
                  <td style="padding-left: 14px; vertical-align: middle;">
                    <div style="font-size: 18px; font-weight: 700; color: #18181b; letter-spacing: -0.3px;">Red Apple</div>
                    <div style="font-size: 11px; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600;">Women's Health Platform</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 0 36px 32px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
              ${headlineBlock}
              ${formattedBody}
              ${signoffBlock}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 36px;">
              <hr style="border: none; border-top: 1px solid #f4f4f5; margin: 0;">
            </td>
          </tr>

          <!-- Footer Note -->
          <tr>
            <td style="padding: 22px 36px 28px; font-size: 12px; color: #a1a1aa; line-height: 1.6;">
              <p style="margin: 0 0 6px;">
                You received this email from Red Apple Health.
              </p>
              <p style="margin: 0;">
                &copy; 2026 Red Apple Health, Inc. &bull; All rights reserved. &bull; <a href="https://redapple.health/unsubscribe" style="color: #e52e2e; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
