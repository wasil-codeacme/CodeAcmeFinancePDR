import { parseArgs } from 'node:util';

import { bootstrapFirstFounder } from '@/server/services/user.service';
import { emailSchema } from '@/server/validators/user.schema';
import { nameSchema } from '@/server/validators/common.schema';

/**
 * First run only: creates the founder who signs in and invites everyone else.
 * Usage: pnpm founder:create --email you@example.com --name "Your Name"
 */
async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { email: { type: 'string' }, name: { type: 'string' } },
  });
  const email = emailSchema.safeParse(values.email);
  const name = nameSchema.safeParse(values.name);
  if (!email.success || !name.success) {
    process.stderr.write('Usage: pnpm founder:create --email you@example.com --name "Your Name"\n');
    process.exitCode = 1;
    return;
  }
  const founder = await bootstrapFirstFounder({ email: email.data, name: name.data });
  process.stdout.write(`Founder created (${founder.id}). Sign in at /login with that email.\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
