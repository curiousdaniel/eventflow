# LRDC EventFlow

Lightweight collaborative event planning and announcement management for **Lion's Roar Dharma Center (LRDC)** in Sacramento, CA.

Built with **Next.js 14 (App Router)**, **Supabase** (Postgres + magic-link auth), **Tailwind CSS + shadcn/ui**, **TypeScript**, and **Anthropic Claude** as the primary interface for creating events and generating content.

See [`LRDC_EventFlow_Cursor_Brief.md`](./LRDC_EventFlow_Cursor_Brief.md) for the full product brief.

---

## Phase 1 — Foundation

This repository currently implements **Phase 1** of the build order: scaffolding, magic-link auth, profile auto-creation, protected app shell, and an empty dashboard. Phases 2–5 (events, calendar, team) will be added later.

---

## Manual setup (one time)

These steps cannot be automated and must be done before the dev server is useful.

### 1. Create a Supabase project

1. Go to <https://supabase.com/dashboard> and create a new project.
2. Wait for it to provision (~2 minutes).

### 2. Apply the schema

In the Supabase dashboard, open **SQL Editor → New query**, paste the contents of [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql), and run it.

This creates the `profiles`, `events`, `event_history`, `event_messages`, `promotional_items` tables, RLS policies, and the `on_auth_user_created` trigger that auto-creates a profile row on first sign-in.

(Or, if you use the Supabase CLI: `supabase db push`.)

### 3. Configure auth redirect URLs

In Supabase **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: add `http://localhost:3000/auth/callback`

When you deploy to Vercel, also add the deployed URLs (e.g. `https://eventflow.vercel.app`, `https://eventflow.vercel.app/auth/callback`).

### 4. Get an Anthropic API key

Create a key at <https://console.anthropic.com/settings/keys>.

### 5. Fill `.env.local`

```bash
cp .env.local.example .env.local
```

Then paste in:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon (public) key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-only, never exposed to the browser)
- `ANTHROPIC_API_KEY` — Anthropic API key

---

## Run the dev server

```bash
pnpm install
pnpm dev
```

Then visit <http://localhost:3000>. You should be redirected to `/signin`. Submit your email, click the magic link in your inbox, and you'll land on `/dashboard`.

---

## Project structure (Phase 1)

```
app/
  (auth)/signin/        magic-link sign-in form
  auth/callback/        Supabase OAuth callback handler
  (app)/
    layout.tsx          authed shell (sidebar + top bar)
    dashboard/          empty state for now
  layout.tsx            root html/body + Toaster
  page.tsx              redirects to /dashboard
components/
  app-shell/            AppSidebar, TopBar, SignOutButton
  ui/                   shadcn primitives
lib/
  supabase/             client.ts, server.ts, middleware.ts
  claude.ts             Anthropic client + MODEL_ID constant
  utils.ts              cn() helper
middleware.ts           refreshes Supabase session, gates protected routes
supabase/
  migrations/0001_init.sql
```

---

## What's next

Phase 2 will add: Zod schemas for the JSONB panels, completeness scoring, the `/events/new` Claude conversation seed intake, the `/events/[id]` workspace with all six panels, and the per-event Claude sidebar.
