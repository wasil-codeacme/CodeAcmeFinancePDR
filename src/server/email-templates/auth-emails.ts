import { LOGIN_CODE_TTL_MINUTES } from '@/lib/constants';
import { MESSAGES } from '@/lib/messages';
import type { EmailMessage } from '@/server/ports/email-service.port';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function loginCodeEmail(to: string, code: string): EmailMessage {
  const text = `Your sign-in code is ${code}. It expires in ${LOGIN_CODE_TTL_MINUTES} minutes. If you did not ask for it, ignore this email.`;
  return {
    to,
    subject: MESSAGES.AUTH.LOGIN_CODE_SUBJECT,
    text,
    html: `<p>Your sign-in code is</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${escapeHtml(code)}</p><p>It expires in ${LOGIN_CODE_TTL_MINUTES} minutes. If you did not ask for it, ignore this email.</p>`,
  };
}

export function inviteEmail(to: string, inviterName: string, loginUrl: string): EmailMessage {
  const text = `${inviterName} invited you to Code Acme Finance. Sign in with this email address at ${loginUrl} — we will email you a one-time code.`;
  return {
    to,
    subject: MESSAGES.AUTH.INVITE_SUBJECT,
    text,
    html: `<p>${escapeHtml(inviterName)} invited you to Code Acme Finance.</p><p><a href="${escapeHtml(loginUrl)}">Sign in</a> with this email address and we will email you a one-time code.</p>`,
  };
}
