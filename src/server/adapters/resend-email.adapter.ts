import type { EmailService } from '@/server/ports/email-service.port';

const RESEND_SEND_URL = 'https://api.resend.com/emails';

export function createResendEmailAdapter(config: { apiKey: string; from: string }): EmailService {
  return {
    async send({ to, subject, html, text }) {
      const response = await fetch(RESEND_SEND_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: config.from, to: [to], subject, html, text }),
      });
      if (!response.ok) {
        throw new Error(`Resend rejected the email with status ${response.status}`);
      }
    },
  };
}
