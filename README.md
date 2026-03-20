# IntervueAI

IntervueAI is a software-engineering-focused mock interview app built with Next.js App Router.

Current V1 flow:
- Auth with Clerk
- Resume upload (Vercel Blob)
- Resume parse (AI structured JSON)
- ATS report generation
- Text-first adaptive interview loop (with browser mic dictation + optional read-aloud)
- Final scorecard generation

## Stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- Clerk for auth
- PostgreSQL + Prisma
- Vercel Blob for resume storage
- AI SDK + OpenAI for parsing, ATS, interview questioning/evaluation

## Environment Variables

Copy `.env.example` to `.env` and fill:

- `NEXT_PUBLIC_APP_URL`
- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `BLOB_READ_WRITE_TOKEN`
- `OPENAI_API_KEY`
- optional: `OPENAI_MODEL`

## Local Development

```bash
pnpm install
pnpm db:generate
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database

Run migrations in development:

```bash
pnpm db:migrate
```

For deploy/runtime schema sync, use your preferred Prisma deployment strategy (typically `prisma migrate deploy` in CI).

## Useful Commands

```bash
pnpm lint
pnpm build
pnpm db:push
```

## Deploy (Vercel)

1. Push to GitHub.
2. Import repo in Vercel.
3. Configure all environment variables from `.env.example`.
4. Ensure your database is reachable from Vercel.
5. Deploy.

Voice features in V1 use browser Web Speech APIs (no extra backend key required). Availability depends on browser support.
