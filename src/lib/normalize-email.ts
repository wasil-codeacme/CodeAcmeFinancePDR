/** Emails are matched case-insensitively; store and compare them in one canonical form. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
