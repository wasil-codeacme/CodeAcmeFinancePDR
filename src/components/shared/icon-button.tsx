'use client';

import type { ComponentProps } from 'react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type IconButtonProps = Omit<ComponentProps<typeof Button>, 'aria-label'> & { label: string };

/**
 * An icon-only button with its label as both a tooltip and the accessible name. It forwards
 * every prop (and the ref) to the button, so it can sit inside dialog and menu triggers.
 */
export function IconButton({ label, ...props }: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button aria-label={label} {...props} />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
