import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

export function SubmitButton({ isPending, children }: { isPending: boolean; children: ReactNode }) {
  return (
    <Button type="submit" disabled={isPending}>
      {isPending ? 'Saving…' : children}
    </Button>
  );
}
