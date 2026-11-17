import type { EmailService } from '@/server/ports/email-service.port';

/**
 * Development-only adapter: prints the email (including any sign-in code) to the terminal
 * so local login works without a provider. env.ts refuses this adapter in production,
 * which is why it may write the message body that the logger would otherwise redact.
 */
export const consoleEmailAdapter: EmailService = {
  async send({ to, subject, text }) {
    process.stdout.write(
      `\n--- email to ${to} ---\nSubject: ${subject}\n\n${text}\n--- end email ---\n\n`,
    );
  },
};
