import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/auth-shell';
import { LoginForm } from '@/components/auth/login-form';
import { SITE } from '@/lib/site';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <AuthShell
      title={`Sign in to ${SITE.NAME}`}
      description="Use the email you were invited with. No password needed."
    >
      <LoginForm />
    </AuthShell>
  );
}
