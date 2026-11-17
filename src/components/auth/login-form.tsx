'use client';

import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import { type FormEvent, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { LOGIN_CODE_LENGTH, LOGIN_CODE_TTL_MINUTES } from '@/lib/constants';
import { MESSAGES } from '@/lib/messages';
import { requestLoginCode, verifyLoginCode } from '@/server/actions/auth.actions';

const DIGITS_ONLY = '^[0-9]+$';
const CODE_SLOTS = Array.from({ length: LOGIN_CODE_LENGTH }, (_, index) => index);

function Spinner() {
  return <Loader2 className="animate-spin" />;
}

/** Two steps: email → one-time code. No passwords, no public sign-up (PRD §3). */
export function LoginForm() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function sendCode(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    startTransition(async () => {
      const result = await requestLoginCode({ email });
      if (result.error !== undefined) {
        toast.error(result.error);
        return;
      }
      toast.success(MESSAGES.AUTH.CODE_SENT);
      setCode('');
      setCodeSent(true);
    });
  }

  function signIn(value: string) {
    startTransition(async () => {
      const result = await verifyLoginCode({ email, code: value });
      if (result?.error !== undefined) {
        toast.error(result.error);
        setCode('');
      }
    });
  }

  if (!codeSent) {
    return (
      <form onSubmit={sendCode}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email">Work email</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@codeacme.com"
              autoFocus
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <FieldDescription>
              We&apos;ll email you a {LOGIN_CODE_LENGTH}-digit sign-in code.
            </FieldDescription>
          </Field>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <Spinner /> : <Mail />}
            {isPending ? 'Sending code…' : 'Email me a code'}
          </Button>
          <p className="text-muted-foreground text-center text-xs">
            Access is by invitation. Ask a founder if you need an account.
          </p>
        </FieldGroup>
      </form>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (code.length === LOGIN_CODE_LENGTH) signIn(code);
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="code">Sign-in code</FieldLabel>
          <FieldDescription>
            Sent to <span className="text-foreground font-medium">{email}</span>. It expires in{' '}
            {LOGIN_CODE_TTL_MINUTES} minutes.
          </FieldDescription>
          <InputOTP
            id="code"
            maxLength={LOGIN_CODE_LENGTH}
            pattern={DIGITS_ONLY}
            autoFocus
            disabled={isPending}
            value={code}
            onChange={setCode}
            onComplete={signIn}
            containerClassName="justify-center"
          >
            <InputOTPGroup>
              {CODE_SLOTS.map((index) => (
                <InputOTPSlot key={index} index={index} className="size-11 text-lg" />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </Field>
        <Button
          type="submit"
          className="w-full"
          disabled={isPending || code.length !== LOGIN_CODE_LENGTH}
        >
          {isPending ? <Spinner /> : null}
          {isPending ? 'Signing in…' : 'Sign in'}
        </Button>
        <div className="flex items-center justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={() => setCodeSent(false)}>
            <ArrowLeft /> Different email
          </Button>
          <Button
            type="button"
            variant="link"
            size="sm"
            disabled={isPending}
            onClick={() => sendCode()}
          >
            Send a new code
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
