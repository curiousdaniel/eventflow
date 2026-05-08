# LRDC EventFlow — Cursor Project Brief

## Project Overview

Build a lightweight collaborative event planning and announcement management web application for **Lion's Roar Dharma Center (LRDC)**, a small Vajrayana Buddhist community in Sacramento, CA. The app is called **EventFlow**.

The core problem it solves: event information starts vague ("Geshe Tsewang is planning to visit in October") and becomes fully-formed over time through multiple iterations. EventFlow manages that progressive enrichment, coordinates a small team, and generates a promotional calendar across all communication channels.

**Claude (Anthropic) is central to the application** — not a feature bolted on, but the primary interface for creating events, filling them out, and generating content.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Hosting | Vercel |
| Database + Auth | Supabase (Postgres + Row Level Security + Magic Link auth) |
| AI | Anthropic SDK (`@anthropic-ai/sdk`) — Claude claude-sonnet-4-20250514 |
| UI | Tailwind CSS + shadcn/ui |
| Language | TypeScript throughout |
| Validation | Zod |
| State | React state + Supabase realtime where needed |

---

## Authentication

- **Magic link only** (no passwords, no OAuth)
- Supabase handles email delivery and session management
- Single role: all authenticated users are admins with full read/write access
- On first sign-in, auto-create a `profiles` row for the user
- Protected routes: all app routes require authentication; unauthenticated users are redirected to `/signin`

---

## Database Schema

### `profiles`
```sql
create table profiles (
  id           uuid primary key references auth.users on delete cascade,
  display_name text not null default '',
  created_at   timestamptz not null default now()
);
```

### `events`
```sql
create type event_stage as enum (
  'seed', 'planning', 'confirmed', 'in_promotion', 'active', 'complete'
);

create type event_type as enum (
  'teaching', 'empowerment', 'retreat', 'community', 'fundraiser', 'other'
);

create table events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null default 'Untitled Event',
  stage        event_stage not null default 'seed',
  event_type   event_type,
  start_date   timestamptz,
  end_date     timestamptz,
  core         jsonb not null default '{}',
  logistics    jsonb not null default '{}',
  approvals    jsonb not null default '{}',
  publicity    jsonb not null default '{}',
  volunteers   jsonb not null default '{}',
  finances     jsonb not null default '{}',
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
```

### `event_history`
```sql
create table event_history (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references events(id) on delete cascade,
  snapshot     jsonb not null,
  changed_by   uuid references profiles(id),
  note         text,
  created_at   timestamptz not null default now()
);
```
Write a history row on every event save. This is the full iteration log.

### `event_messages`
```sql
create table event_messages (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references events(id) on delete cascade,
  role         text not null check (role in ('user', 'assistant')),
  content      text not null,
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now()
);
```
Persisted Claude sidebar chat history, per event.

### `promotional_items`
```sql
create type promo_status as enum ('pending', 'drafted', 'sent');

create table promotional_items (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references events(id) on delete cascade,
  channel      text not null,
  action_type  text not null,
  target_date  date not null,
  status       promo_status not null default 'pending',
  content      text,
  created_at   timestamptz not null default now()
);
```

### RLS Policies
For v1, keep RLS simple: authenticated users can read and write all rows in all tables.

```sql
-- Example pattern (apply to all tables):
alter table events enable row level security;
create policy "authenticated users have full access"
  on events for all
  using (auth.role() = 'authenticated');
```

---

## JSONB Panel Schemas (TypeScript / Zod)

Define these types in `lib/schemas.ts` and use them throughout.

### Core Panel
```typescript
const CoreSchema = z.object({
  teacher:          z.string().optional(),
  location:         z.string().optional(),
  description:      z.string().optional(),
  registration_url: z.string().optional(),
  capacity:         z.number().optional(),
  notes:            z.string().optional(),
});
```

### Logistics Panel
```typescript
const LogisticsSchema = z.object({
  venue_details:  z.string().optional(),
  av_needs:       z.string().optional(),
  setup_teardown: z.string().optional(),
  catering:       z.string().optional(),
  accessibility:  z.string().optional(),
  notes:          z.string().optional(),
});
```

### Approvals Panel
```typescript
const ApprovalsSchema = z.object({
  rinpoche_approved:      z.boolean().default(false),
  rinpoche_approved_date: z.string().optional(),
  admin_approved:         z.boolean().default(false),
  notes:                  z.string().optional(),
});
```

### Publicity Panel
Each of the six channels uses the same sub-shape:
```typescript
const ChannelSchema = z.object({
  status:         z.enum(['not_started', 'draft', 'needs_approval', 'approved', 'published']).default('not_started'),
  draft:          z.string().optional(),
  url:            z.string().optional(),
  scheduled_date: z.string().optional(),
});

const PublicitySchema = z.object({
  website:    ChannelSchema.default({}),
  newsletter: ChannelSchema.default({}),
  eventbrite: ChannelSchema.default({}),
  facebook:   ChannelSchema.default({}),
  meetup:     ChannelSchema.default({}),
  sms:        ChannelSchema.default({}),
});
```

### Volunteers Panel
```typescript
const VolunteersSchema = z.object({
  roles: z.array(z.object({
    role:        z.string(),
    assigned_to: z.string().optional(),
    notes:       z.string().optional(),
  })).default([]),
});
```

### Finances Panel
```typescript
const FinancesSchema = z.object({
  dana:                z.boolean().default(false),
  registration_fee:    z.string().optional(),
  expected_attendance: z.number().optional(),
  budget_notes:        z.string().optional(),
});
```

---

## Application Structure

```
app/
  (auth)/
    signin/           page.tsx  — magic link sign-in form
    auth/callback/    route.ts  — Supabase auth callback handler
  (app)/
    layout.tsx        — shell layout with sidebar nav, requires auth
    dashboard/        page.tsx  — event card grid + activity feed
    events/
      new/            page.tsx  — Claude conversation seed intake (default) + quick-create toggle
      [id]/           page.tsx  — event workspace (panels + Claude sidebar)
    calendar/         page.tsx  — promotional calendar view
    team/             page.tsx  — invite users, manage team

components/
  events/
    EventCard.tsx
    StageAdvanceButton.tsx
    CompletenessBar.tsx
    PanelCore.tsx
    PanelLogistics.tsx
    PanelApprovals.tsx
    PanelPublicity.tsx
    PanelVolunteers.tsx
    PanelFinances.tsx
    HistoryTimeline.tsx
  claude/
    SeedConversation.tsx    — full-screen intake chat
    EventSidebar.tsx        — per-event Claude sidebar
    PromoItemDrawer.tsx     — "Ask Claude to draft this" drawer
  calendar/
    CalendarView.tsx
    CalendarItem.tsx
  ui/                       — shadcn/ui components

lib/
  schemas.ts                — Zod schemas for all JSONB panels
  completeness.ts           — completeness scoring logic
  promo-timeline.ts         — promotional calendar generation logic
  claude.ts                 — Anthropic client + system prompt builders
  supabase/
    client.ts               — browser client
    server.ts               — server client
    middleware.ts

hooks/
  useEvent.ts
  useEventMessages.ts
  usePromotionalItems.ts
```

---

## Page Specifications

### `/signin`
Simple centered card. Email input + "Send magic link" button. On submit, call `supabase.auth.signInWithOtp({ email })`. Show confirmation message. No password field.

---

### `/dashboard`
- Grid of `EventCard` components, each showing: title, stage badge, event type, start date (or "Date TBD"), completeness score, last updated
- Filter bar: All / by stage / by event type
- "New Event" button — navigates to `/events/new`
- Activity feed panel on the right: last 10 `event_history` rows across all events, showing who changed what and when

---

### `/events/new` — Seed Intake

**Default view: Claude conversation**

Full-screen two-column layout:
- Left: chat interface
- Right: live "event preview card" that updates as Claude extracts structured data

The conversation is driven by a carefully crafted system prompt (see Claude Integration section). After 2–3 exchanges, Claude produces a structured JSON object. The preview card shows the extracted fields. A "Create Event" confirm button appears when Claude has at least a title and some initial data.

On confirm: write the event to Supabase, write the first history snapshot, redirect to `/events/[id]`.

**Toggle: Quick-create form**

A small "Use quick form instead" link at the top right switches to a minimal form:
- Title (text)
- Event type (select)
- Rough start date (date picker, optional)
- Rough end date (date picker, optional)
- Initial notes (textarea, optional)

Submits directly without a Claude conversation.

---

### `/events/[id]` — Event Workspace

**Layout:**
- Top bar: event title (editable inline), stage badge, stage-advance button
- Main area: tabbed panel navigation (Core / Logistics / Approvals / Publicity / Volunteers / Finances)
- Each tab shows a completeness fraction (e.g., "3 / 5 fields")
- Right sidebar (fixed, ~320px): Claude chat for this event
- Below tabs: collapsible History Timeline

**Stage Advance Button:**
- On click: check required fields for the next stage (see Completeness section)
- If requirements not met: show a warning modal listing what's missing, with option to proceed anyway
- If requirements met: advance stage, trigger Claude to generate a "what to do next" note (saved to event_messages), write history snapshot with note "Stage advanced to [stage]"

**Panel behavior:**
- All panels are editable forms
- Save on blur for individual fields (optimistic update)
- On save: update `events.updated_at`, write history snapshot

**Claude sidebar:**
- Persistent chat loaded with full event context (see Claude Integration)
- Messages persisted to `event_messages`
- Input at bottom, message list scrolls up
- Show assistant typing indicator during streaming

**History Timeline:**
- Collapsible section at bottom of page
- List of `event_history` rows for this event: timestamp, changed_by display name, note (if any)
- "View snapshot" expands to show the full JSON of that version (formatted nicely)

---

### `/calendar` — Promotional Calendar

**Layout:**
- Month view by default, week view toggle
- Each day shows promotional items due on that date
- Items are color-coded by channel (assign a consistent color per channel)
- Filter: All events / single event selector

**Item interaction:**
- Click an item → side drawer opens
- Drawer shows: event title, channel, action type, target date, status dropdown, content textarea
- "Ask Claude to draft this" button — calls Claude with event context + channel + action type, streams result into content field
- Save button writes back to `promotional_items`

**Generate Schedule button** (per event, shown when event is at `confirmed` stage or later):
- Only available when `start_date` is set
- Generates `promotional_items` rows using the promotion timeline logic (see below)
- Warns if items already exist: "Regenerate will overwrite existing pending items. Drafted and sent items will be preserved."

---

### `/team` — Team Management

- List of current team members (from `profiles`)
- "Invite someone" form: enter email, calls `supabase.auth.signInWithOtp({ email })` — they receive a magic link that creates their account on first use
- Display name editing for own profile

---

## Completeness Scoring

Defined in `lib/completeness.ts`. Returns a score (0–1) per panel, per stage.

### Required fields by stage:

| Stage | Required |
|---|---|
| `seed` | `title` |
| `planning` | `title`, `event_type`, `core.teacher` or `core.description` |
| `confirmed` | `title`, `event_type`, `start_date`, `core.location`, `approvals.rinpoche_approved` |
| `in_promotion` | All of `confirmed` + at least one publicity channel not `not_started` |
| `active` | All of `in_promotion` + at least one publicity channel `published` |
| `complete` | No additional requirements — this is a manual close-out |

Completeness score per panel = (filled required fields for current stage) / (total required fields for current stage that belong to this panel).

Expose as: `getEventCompleteness(event): { overall: number, panels: Record<string, number> }`

---

## Promotional Timeline Logic

Defined in `lib/promo-timeline.ts`.

Takes `event_type` and `start_date`, returns an array of `{ channel, action_type, target_date }` objects.

### Framework by event type:

**Retreat / Visiting Teacher (`retreat`, `empowerment`):**
```
8 weeks before:  website (announce), eventbrite (listing_live)
6 weeks before:  newsletter (announce), facebook (event_created), meetup (event_created)
4 weeks before:  newsletter (reminder), social_media (reminder), facebook (reminder)
3 weeks before:  newsletter (reminder), social_media (reminder)
2 weeks before:  newsletter (final_push), social_media (final_push), facebook (final_push), meetup (final_push)
1 week before:   newsletter (last_call), social_media (last_call), sms (reminder)
Day before:      sms (final_reminder)
```

**Special Event / Teaching (`teaching`, `fundraiser`):**
```
4 weeks before:  website (announce), eventbrite (listing_live, if applicable)
3 weeks before:  newsletter (announce), facebook (event_created)
2 weeks before:  newsletter (reminder), social_media (reminder), facebook (reminder)
1 week before:   newsletter (final_push), social_media (final_push), sms (reminder)
Day before:      sms (final_reminder, if warranted)
```

**Community / Regular (`community`, `other`):**
```
2 weeks before:  website (announce), newsletter (announce)
1 week before:   social_media (reminder), newsletter (reminder)
Day of:          sms (day_of, if warranted)
```

When generating, skip any item whose `target_date` is in the past.

---

## Claude Integration

### Client setup (`lib/claude.ts`)

```typescript
import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

Always use model: `claude-sonnet-4-20250514`  
Always set `max_tokens: 1024` unless generating long-form content (use 2048 for draft copy).  
Use streaming (`stream: true`) for all user-facing responses.

---

### System Prompt: Seed Intake Conversation

```
You are helping create a new event record for Lion's Roar Dharma Center (LRDC), a small Vajrayana Buddhist dharma center in Sacramento, CA run by Rinpoche Geshe Ngawang Dakpa. LRDC hosts teachings, empowerments, retreats, community events, and fundraisers.

Your job is to gather enough information to create an initial event record through natural conversation. You are warm, efficient, and familiar with Buddhist event planning.

Extract as much as you can from what the user tells you. Ask targeted follow-up questions — no more than 2-3 at a time — to fill in: event title, event type (teaching/empowerment/retreat/community/fundraiser/other), rough dates, teacher or speaker name, and location.

When you have gathered enough for a useful starting record (at minimum: a title and some sense of what the event is), output a JSON block in this exact format wrapped in <event_data> tags:

<event_data>
{
  "title": "",
  "event_type": "",
  "start_date": null,
  "end_date": null,
  "core": {
    "teacher": "",
    "location": "",
    "description": "",
    "notes": ""
  }
}
</event_data>

Continue the conversation to refine the data. Re-emit the <event_data> block whenever the structured data changes. The user's app will parse the most recent <event_data> block to show a live preview.

Keep your conversational responses brief and warm. This is a planning tool, not a chat assistant.
```

Parse `<event_data>` tags from the assistant's streaming response on the client to update the live preview card in real time.

---

### System Prompt: Event Sidebar

Build this dynamically in `lib/claude.ts` as a function `buildEventSystemPrompt(event, completeness, today)`:

```
You are the planning assistant for Lion's Roar Dharma Center (LRDC), a small Vajrayana Buddhist dharma center in Sacramento, CA. You are embedded in the EventFlow planning tool.

Today's date is ${today}.

You are helping coordinate the following event:

## Event Record
${JSON.stringify(event, null, 2)}

## Completeness
${JSON.stringify(completeness, null, 2)}

## About LRDC's Communication Channels
- Website: managed by Dirk
- Email newsletter: managed by Patty
- Social media (Facebook, Instagram, YouTube): managed by Daniel
- SMS text message list: managed by Daniel
- Eventbrite: managed by Daniel
- Meetup.com group: managed by Daniel

## Your Role
Answer questions about this event specifically. Help draft content for any channel. Identify what information is still missing. Suggest next steps based on the current stage and completeness. Generate promotional copy when asked. Be concise and practical.

When drafting content, tailor it to the channel:
- Newsletter: warm, informative, 150-300 words
- Social media: brief, engaging, include a call to action
- SMS: under 160 characters, urgent and clear
- Eventbrite: full description with all logistics, 200-400 words

Do not hallucinate event details. If a field is empty or null, say so rather than inventing content.
```

---

### System Prompt: Stage Transition Note

When an event advances a stage, call Claude with this one-shot prompt to generate a brief "what to do next" note:

```
Event: ${event.title}
Just advanced from stage: ${previousStage} → ${newStage}
Current record: ${JSON.stringify(event)}
Today: ${today}

Write a brief (3-5 bullet points) action-oriented note: what are the most important next steps now that this event is at the ${newStage} stage? Be specific to this event's details. Focus on what's incomplete and time-sensitive.
```

Save the result to `event_messages` with `role: 'assistant'` and a note prefix like "**Stage advanced to [stage] — next steps:**".

---

### Promotional Item Draft

When user clicks "Ask Claude to draft this" in the CalendarItem drawer:

```
Event: ${JSON.stringify(event)}
Today: ${today}
Days until event: ${daysUntil}

Draft ${channel} content for this event.
Action type: ${action_type}
Scheduled for: ${target_date}

Channel guidelines:
[include channel-specific guidelines from the sidebar system prompt above]

Output only the draft content, no commentary.
```

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
```

---

## Build Order

Build in this order. Complete each phase before starting the next.

### Phase 1 — Foundation
1. Scaffold Next.js 14 app with TypeScript, Tailwind, shadcn/ui
2. Connect Supabase — install `@supabase/supabase-js` and `@supabase/ssr`
3. Run all schema migrations in Supabase dashboard
4. Implement magic link auth: `/signin` page, `/auth/callback` route handler, middleware protecting all `/app/*` routes
5. Auto-create `profiles` row on first sign-in
6. Shell layout: left sidebar nav (Dashboard, Calendar, Team), top bar with user display name + sign out
7. Empty dashboard page

**Checkpoint:** Sign in via magic link, see empty dashboard, sign out works.

---

### Phase 2 — Event CRUD + Claude Sidebar
1. Define all Zod schemas in `lib/schemas.ts`
2. Implement `lib/completeness.ts`
3. Implement `lib/claude.ts` with Anthropic client and system prompt builders
4. Build `/events/new` — Claude conversation seed intake with live preview card, plus quick-create form toggle
5. Build `/events/[id]` workspace:
   - All six panel forms (editable, save-on-blur)
   - Completeness indicators per tab
   - Stage badge + stage-advance button with requirements check
   - Claude sidebar with streaming, persisted messages
   - History timeline (collapsible)
6. EventCard component for dashboard
7. Wire dashboard to load and display all events

**Checkpoint:** Create an event via Claude conversation, fill out panels, chat with Claude in sidebar, see history entries, advance stages.

---

### Phase 3 — Lifecycle Intelligence
1. Stage advance guard rail modal (lists missing required fields)
2. Stage transition: Claude generates "next steps" note, auto-appended to sidebar
3. Date-threshold completeness alerts (banner on event workspace if event is within N weeks and panel completeness is below threshold)
4. History snapshot on every panel save (not just stage advances)

**Checkpoint:** Advance a stage, see Claude's next-steps note appear in sidebar. Get an alert when an event is close and missing key info.

---

### Phase 4 — Promotional Calendar
1. Implement `lib/promo-timeline.ts`
2. "Generate Schedule" button on event workspace (appears at `confirmed` stage+)
3. `GET /api/events/[id]/generate-promo` route: runs timeline logic, writes `promotional_items`, returns created items
4. Build `/calendar` page with month/week views
5. CalendarItem drawer with status editing + "Ask Claude to draft" button
6. Streaming Claude draft into content field

**Checkpoint:** Confirm event dates, generate schedule, see items on calendar, open an item and ask Claude to draft the content.

---

### Phase 5 — Multi-user
1. `/team` page: list team members, invite by email (magic link), own display name editing
2. `created_by` / `changed_by` fields populated throughout
3. Dashboard activity feed: last 10 history entries across all events
4. "Last edited by [name] at [time]" shown on event workspace

**Checkpoint:** Invite a second user, have them sign in and edit an event, see their name in the activity feed.

---

## Key Implementation Notes

**Streaming Claude responses:** Use the Anthropic SDK's streaming API. On the server, create a `ReadableStream` and pipe Claude's stream to the response. On the client, read the stream incrementally and update state. Use Next.js Route Handlers (`app/api/`) for all Claude calls — never expose the API key to the client.

**Seed intake live preview:** Parse `<event_data>...</event_data>` tags from the streaming response using a simple string scan on each chunk. When a complete block is found, JSON.parse it and update the preview card state.

**Save-on-blur pattern for panels:** Use React controlled inputs. On `onBlur`, call a debounced save function that PATCHes the event via a Route Handler. Write a history snapshot in the same transaction (use a Supabase Edge Function or a server action that does both writes).

**Supabase + Next.js App Router:** Use `@supabase/ssr` for server-side session management. Create separate client instances for browser (`createBrowserClient`) and server (`createServerClient`). The middleware refreshes sessions on every request.

**Date handling:** Store all dates as ISO 8601 strings in JSONB fields. Use `date-fns` for all date arithmetic in the promotional timeline logic.

**Channel color mapping** (consistent throughout the UI):
```typescript
export const CHANNEL_COLORS = {
  website:    'blue',
  newsletter: 'green',
  eventbrite: 'orange',
  facebook:   'indigo',
  meetup:     'red',
  sms:        'yellow',
};
```

---

## About the Organization

**Lion's Roar Dharma Center (LRDC)** is a small Vajrayana Buddhist dharma center in Sacramento, CA. It is led by **Rinpoche Geshe Ngawang Dakpa**. The center hosts regular weekly practices as well as special teachings, empowerments, and retreats — sometimes featuring visiting Tibetan teachers.

Key people referenced in the app context:
- **Rinpoche** — spiritual director; his approval is required for certain event types
- **Patty** — manages the email newsletter and acts as primary admin coordinator
- **Dirk** — manages the website
- **Daniel** — manages social media, SMS, Eventbrite, and Meetup
- **Jen** — manages the membership committee and is an admin
- **Ellen** — manages the financial aspects of the organization and is an admin

This context should be included in all Claude system prompts to ensure responses are grounded and specific rather than generic.

---

*Brief version: 1.0 — May 2026*
