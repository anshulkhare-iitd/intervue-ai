# IntervueAI

A software-engineering-focused mock interview app — upload your resume, get an ATS analysis, and run an adaptive AI-driven interview with a final scorecard.

**Live demo: [intervue-ai-two-theta.vercel.app](https://intervue-ai-two-theta.vercel.app/)**

## Features

- **Resume upload & parsing** — upload a PDF or DOCX and extract structured profile data via Gemini AI
- **ATS analysis** — score your resume against a target role with actionable improvement suggestions
- **Adaptive mock interviews** — AI-generated questions that adapt based on your previous answers, with browser mic dictation and optional read-aloud
- **Scorecard** — per-question breakdown across technical depth, clarity, behavioral signals, and an overall hire-readiness rating

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), TypeScript |
| UI | Tailwind CSS v4, shadcn/ui, Radix UI |
| Auth | Clerk |
| Database | PostgreSQL (Neon) + Prisma |
| Storage | Vercel Blob |
| AI | Vercel AI SDK + Google Gemini 2.5 Flash |
| Deploy | Vercel |

## Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env file and fill in values (see below)
cp .env.example .env

# 3. Generate Prisma client and run migrations
pnpm db:generate
pnpm db:migrate

# 4. Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Yes | App base URL (e.g. `http://localhost:3000`) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key |
| `BLOB_READ_WRITE_TOKEN` | Yes | Vercel Blob token |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes | Google Gemini API key |
| `GEMINI_MODEL` | No | Override model (default: `gemini-2.5-flash`) |
| `NEXT_PUBLIC_ENABLE_TTS` | No | Enable read-aloud (default: `true`) |

## Useful Commands

```bash
pnpm lint          # ESLint
pnpm build         # Production build
pnpm db:push       # Push schema changes without a migration (dev only)
pnpm db:migrate    # Run migrations
pnpm db:generate   # Regenerate Prisma client after schema changes
```

## Deploy to Vercel

1. Push to GitHub and import the repo in Vercel.
2. Add all required environment variables from the table above.
3. Ensure your Postgres database is accessible from Vercel (Neon works out of the box via the Vercel Marketplace integration).
4. Deploy — no additional build config required.

> Voice features use the browser Web Speech API — no extra backend key needed. Availability depends on browser support (Chrome/Edge work best).
