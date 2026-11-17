'use client';

import { type FormEvent, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LOGIN_CODE_LENGTH } from '@/lib/constants';
import { MESSAGES } from '@/lib/messages';
import { requestLoginCode, verifyLoginCode } from '@/server/actions/auth.actions';

/** Two steps: email → one-time code. No passwords, no public sign-up (PRD §3). */
export function LoginForm() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await requestLoginCode({ email });
      if (result.error !== undefined) {
        toast.error(result.error);
        return;
      }
      toast.success(MESSAGES.AUTH.CODE_SENT);
      setCodeSent(true);
    });
  }

  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await verifyLoginCode({ email, code });
      if (result?.error !== undefined) toast.error(result.error);
    });
  }

  if (!codeSent) {
    return (
      <form onSubmit={sendCode} className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Sending…' : 'Email me a sign-in code'}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={signIn} className="grid gap-4">
      <p className="text-muted-foreground text-sm">
        Enter the {LOGIN_CODE_LENGTH}-digit code sent to{' '}
        <span className="text-foreground font-medium">{email}</span>.
      </p>
      <div className="grid gap-1.5">
        <Label htmlFor="code">Sign-in code</Label>
        <Input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          required
          maxLength={LOGIN_CODE_LENGTH}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
          className="text-center text-lg tracking-[0.4em]"
        />
      </div>
      <Button type="submit" disabled={isPending || code.length !== LOGIN_CODE_LENGTH}>
        {isPending ? 'Signing in…' : 'Sign in'}
      </Button>
      <Button type="button" variant="ghost" onClick={() => setCodeSent(false)}>
        Use a different email
      </Button>
    </form>
  );
}
