# CodeAcme Finance

Replaces the "Code Acme Business Revenue & P&L" workbook. This is build step 1 of the PRD
("Core books"): email-code login, Settings and onboarding, clients and projects, revenue,
receivables, expenses with recurring templates, and the monthly P&L with partner distribution.

## Stack

Next.js 16.4 (App Router, Cache Components, Partial Prefetching, `src/proxy.ts`), React 19,
TypeScript strict, Tailwind v4, shadcn/ui (radix-nova), Prisma 7 + `@prisma/adapter-pg`,
Zod 4, React Hook Form, sonner, pino, decimal.js, Vitest. Package manager: pnpm.

## Run locally

```bash
pnpm install
pnpm db:local                       # Prisma dev Postgres (no Docker); copy its URLs into .env
cp .env.example .env                # then fill in DATABASE_URL, APP_URL, email settings
pnpm db:migrate
pnpm founder:create --email you@codeacme.com --name "Your Name"   # first founder only
pnpm dev                            # http://localhost:3000 → sign in → onboarding
```

Everyone else is invited from Settings → Users.

## Checks

```bash
pnpm check                # typecheck + lint + tests + build
pnpm reconcile:workbook   # app vs reference workbook, every month tab, as a Markdown table
```

## Deploy (Vercel)

1. Create a Postgres database (Vercel Marketplace: Neon, Supabase, Prisma Postgres…).
2. In the Vercel project, set the variables from `.env.example`: `DATABASE_URL` (pooled is
   fine), `DIRECT_DATABASE_URL` (unpooled, for migrations; skip if `DATABASE_URL` is direct),
   `APP_URL`, `EMAIL_PROVIDER=resend`, `EMAIL_FROM`, `RESEND_API_KEY`.
3. Deploy. The `vercel-build` script runs `prisma generate`, then `prisma migrate deploy`
   (creates or updates the tables), then `next build` — every deploy provisions the schema,
   and a failed migration stops the deploy before it goes live.
4. Create the first founder once, against the production database:
   `DATABASE_URL=… pnpm founder:create --email you@codeacme.com --name "Your Name"`.

## How it is built

- Layering: Server Action (`writeAction`) → service → repository → Prisma. Every write is
  audited in the same transaction (`src/server/repositories/audited-write.ts`).
- All PRD §6 calculation rules live in pure functions in `src/server/domain/` and are tested
  against the anonymised reference workbook (`reference-workbook.fixture.json`).
- Money is stored and summed as exact decimals; it is rounded to cents only for display.
- Roles are permission sets (`src/lib/permissions.ts`), checked on the server; partner
  distribution is not computed at all for users without `distribution:view`.
- Page titles render instantly; data streams in behind `<Suspense>` with skeletons. Settings
  and the client list are cached server-side (`"use cache"`, tag-invalidated on write); money
  figures are always read live.
