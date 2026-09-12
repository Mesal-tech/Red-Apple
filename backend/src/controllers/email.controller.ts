import { Request, Response, NextFunction } from 'express';

export async function sendEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { to, from, subject, html, text, cc, bcc, replyTo } = req.body;

    const apiKey = (req.headers['x-resend-api-key'] as string) || process.env.RESEND_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing RESEND_API_KEY in environment or x-resend-api-key header',
      });
    }

    if (!to || !subject || !html) {
      return res.status(400).json({
        success: false,
        error: 'to, subject, and html are required fields',
      });
    }

    const payload: Record<string, unknown> = {
      from: from || 'Red Apple Health <notifications@arkclinicwarri.com>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      reply_to: replyTo || 'support@arkclinicwarri.com',
    };

    if (text) payload.text = text;
    if (cc) payload.cc = Array.isArray(cc) ? cc : [cc];
    if (bcc) payload.bcc = Array.isArray(bcc) ? bcc : [bcc];

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await resendResponse.json();

    if (!resendResponse.ok) {
      return res.status(resendResponse.status).json({
        success: false,
        error: data.message || 'Failed to dispatch email via Resend',
        details: data,
      });
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}
