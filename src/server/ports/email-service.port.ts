export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/** Outbound email. Callers depend on this port; the provider is chosen in the container. */
export interface EmailService {
  send(message: EmailMessage): Promise<void>;
}
