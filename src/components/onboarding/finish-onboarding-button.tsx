'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { useActionRunner } from '@/hooks/use-action-runner';
import { MESSAGES } from '@/lib/messages';
import { ROUTES } from '@/lib/routes';
import { completeOnboarding } from '@/server/actions/settings.actions';

export function FinishOnboardingButton({ ready }: { ready: boolean }) {
  const router = useRouter();
  const { run, isPending } = useActionRunner();
  return (
    <Button
      disabled={!ready || isPending}
      onClick={() =>
        run(
          () => completeOnboarding({}),
          MESSAGES.ONBOARDING.COMPLETED,
          () => router.push(ROUTES.HOME),
        )
      }
    >
      Finish setup
    </Button>
  );
}
