import { z } from "zod";

// -----------------------------------------------------------------------------
// Enums (mirror the Postgres enums in supabase/migrations/0001_init.sql)
// -----------------------------------------------------------------------------
export const EVENT_STAGES = [
  "seed",
  "planning",
  "confirmed",
  "in_promotion",
  "active",
  "complete",
] as const;
export type EventStage = (typeof EVENT_STAGES)[number];
export const EventStageEnum = z.enum(EVENT_STAGES);

export const EVENT_TYPES = [
  "teaching",
  "empowerment",
  "retreat",
  "community",
  "fundraiser",
  "other",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];
export const EventTypeEnum = z.enum(EVENT_TYPES);

export const STAGE_LABELS: Record<EventStage, string> = {
  seed: "Seed",
  planning: "Planning",
  confirmed: "Confirmed",
  in_promotion: "In promotion",
  active: "Active",
  complete: "Complete",
};

export const TYPE_LABELS: Record<EventType, string> = {
  teaching: "Teaching",
  empowerment: "Empowerment",
  retreat: "Retreat",
  community: "Community",
  fundraiser: "Fundraiser",
  other: "Other",
};

export function nextStage(stage: EventStage): EventStage | null {
  const idx = EVENT_STAGES.indexOf(stage);
  if (idx < 0 || idx >= EVENT_STAGES.length - 1) return null;
  return EVENT_STAGES[idx + 1];
}

// -----------------------------------------------------------------------------
// Panel schemas
// -----------------------------------------------------------------------------
export const CoreSchema = z.object({
  teacher: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  registration_url: z.string().optional(),
  capacity: z.number().optional(),
  notes: z.string().optional(),
});
export type Core = z.infer<typeof CoreSchema>;

export const LogisticsSchema = z.object({
  venue_details: z.string().optional(),
  av_needs: z.string().optional(),
  setup_teardown: z.string().optional(),
  catering: z.string().optional(),
  accessibility: z.string().optional(),
  notes: z.string().optional(),
});
export type Logistics = z.infer<typeof LogisticsSchema>;

export const ApprovalsSchema = z.object({
  rinpoche_approved: z.boolean().default(false),
  rinpoche_approved_date: z.string().optional(),
  admin_approved: z.boolean().default(false),
  notes: z.string().optional(),
});
export type Approvals = z.infer<typeof ApprovalsSchema>;

export const CHANNEL_STATUSES = [
  "not_started",
  "draft",
  "needs_approval",
  "approved",
  "published",
] as const;
export type ChannelStatus = (typeof CHANNEL_STATUSES)[number];
export const ChannelStatusEnum = z.enum(CHANNEL_STATUSES);

export const CHANNEL_STATUS_LABELS: Record<ChannelStatus, string> = {
  not_started: "Not started",
  draft: "Draft",
  needs_approval: "Needs approval",
  approved: "Approved",
  published: "Published",
};

export const ChannelSchema = z.object({
  status: ChannelStatusEnum.default("not_started"),
  draft: z.string().optional(),
  url: z.string().optional(),
  scheduled_date: z.string().optional(),
});
export type Channel = z.infer<typeof ChannelSchema>;

export const CHANNEL_KEYS = [
  "website",
  "newsletter",
  "eventbrite",
  "facebook",
  "meetup",
  "sms",
] as const;
export type ChannelKey = (typeof CHANNEL_KEYS)[number];

export const CHANNEL_LABELS: Record<ChannelKey, string> = {
  website: "Website",
  newsletter: "Newsletter",
  eventbrite: "Eventbrite",
  facebook: "Facebook",
  meetup: "Meetup",
  sms: "SMS",
};

const defaultChannel = () => ({ status: "not_started" as const });

export const PublicitySchema = z.object({
  website: ChannelSchema.default(defaultChannel),
  newsletter: ChannelSchema.default(defaultChannel),
  eventbrite: ChannelSchema.default(defaultChannel),
  facebook: ChannelSchema.default(defaultChannel),
  meetup: ChannelSchema.default(defaultChannel),
  sms: ChannelSchema.default(defaultChannel),
});
export type Publicity = z.infer<typeof PublicitySchema>;

export const VolunteerRoleSchema = z.object({
  role: z.string(),
  assigned_to: z.string().optional(),
  notes: z.string().optional(),
});
export type VolunteerRole = z.infer<typeof VolunteerRoleSchema>;

export const VolunteersSchema = z.object({
  roles: z.array(VolunteerRoleSchema).default([]),
});
export type Volunteers = z.infer<typeof VolunteersSchema>;

export const FinancesSchema = z.object({
  dana: z.boolean().default(false),
  registration_fee: z.string().optional(),
  expected_attendance: z.number().optional(),
  budget_notes: z.string().optional(),
});
export type Finances = z.infer<typeof FinancesSchema>;

// -----------------------------------------------------------------------------
// EventRow — full event record as stored in Postgres
// -----------------------------------------------------------------------------
export const EventRowSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  stage: EventStageEnum,
  event_type: EventTypeEnum.nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  core: CoreSchema,
  logistics: LogisticsSchema,
  approvals: ApprovalsSchema,
  publicity: PublicitySchema,
  volunteers: VolunteersSchema,
  finances: FinancesSchema,
  created_by: z.string().uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type EventRow = z.infer<typeof EventRowSchema>;

/**
 * Defensive parser. Postgres JSONB columns may be stored as null or with
 * partial data when manually edited — coerce to a fully-shaped EventRow so
 * UI code can rely on every field being present.
 */
export function parseEventRow(raw: unknown): EventRow {
  const r = raw as Record<string, unknown>;
  return EventRowSchema.parse({
    ...r,
    core: CoreSchema.parse(r.core ?? {}),
    logistics: LogisticsSchema.parse(r.logistics ?? {}),
    approvals: ApprovalsSchema.parse(r.approvals ?? {}),
    publicity: PublicitySchema.parse(r.publicity ?? {}),
    volunteers: VolunteersSchema.parse(r.volunteers ?? {}),
    finances: FinancesSchema.parse(r.finances ?? {}),
  });
}

// -----------------------------------------------------------------------------
// Panel keys
// -----------------------------------------------------------------------------
export const PANEL_KEYS = [
  "core",
  "logistics",
  "approvals",
  "publicity",
  "volunteers",
  "finances",
] as const;
export type PanelKey = (typeof PANEL_KEYS)[number];

export const PANEL_LABELS: Record<PanelKey, string> = {
  core: "Core",
  logistics: "Logistics",
  approvals: "Approvals",
  publicity: "Publicity",
  volunteers: "Volunteers",
  finances: "Finances",
};

export const PanelKeyEnum = z.enum(PANEL_KEYS);

export const PANEL_SCHEMAS = {
  core: CoreSchema,
  logistics: LogisticsSchema,
  approvals: ApprovalsSchema,
  publicity: PublicitySchema,
  volunteers: VolunteersSchema,
  finances: FinancesSchema,
} as const;

// -----------------------------------------------------------------------------
// Channel color mapping (per the brief). Tailwind class fragments live in UI
// helpers; the canonical map of channel -> semantic color name lives here.
// -----------------------------------------------------------------------------
export const CHANNEL_COLORS: Record<ChannelKey, string> = {
  website: "blue",
  newsletter: "green",
  eventbrite: "orange",
  facebook: "indigo",
  meetup: "red",
  sms: "yellow",
};

// -----------------------------------------------------------------------------
// Seed-intake "event_data" block schema — emitted by Claude inside
// <event_data>...</event_data> tags during the /events/new conversation.
// -----------------------------------------------------------------------------
export const SeedEventDataSchema = z.object({
  title: z.string().optional(),
  event_type: z.string().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  core: z
    .object({
      teacher: z.string().optional(),
      location: z.string().optional(),
      description: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
});
export type SeedEventData = z.infer<typeof SeedEventDataSchema>;

/**
 * Parse the latest <event_data>...</event_data> block out of an in-flight
 * streaming buffer. Returns null if no complete block is present yet.
 */
export function parseLatestEventData(buffer: string): SeedEventData | null {
  const matches = [...buffer.matchAll(/<event_data>([\s\S]*?)<\/event_data>/g)];
  if (matches.length === 0) return null;
  const last = matches[matches.length - 1][1];
  try {
    const json = JSON.parse(last);
    return SeedEventDataSchema.parse(json);
  } catch {
    return null;
  }
}

/**
 * Strip <event_data> blocks out of assistant text for display in the chat
 * transcript — the user shouldn't see the raw JSON in the conversation.
 */
export function stripEventDataBlocks(text: string): string {
  return text.replace(/<event_data>[\s\S]*?<\/event_data>/g, "").trim();
}
