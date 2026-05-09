import type { EventType } from "@/lib/schemas";

/**
 * A single planned promotional action emitted by the timeline generator.
 * `target_date` is an ISO date (YYYY-MM-DD).
 */
export interface PromoTimelineItem {
  channel: string;
  action_type: string;
  target_date: string;
}

interface OffsetEntry {
  daysBefore: number;
  channels: Array<{ channel: string; action_type: string }>;
}

/**
 * Three frameworks per the brief:
 *
 *  - "Big" (teaching, empowerment, retreat): 8-week ramp.
 *  - "Medium" (fundraiser): 4-week ramp.
 *  - "Small" (community, other): 2-week ramp.
 *
 * Day-of and day-before SMS items are emitted with daysBefore: 1 / 0.
 */
const FRAMEWORK_BIG: OffsetEntry[] = [
  {
    daysBefore: 56,
    channels: [
      { channel: "website", action_type: "announce" },
      { channel: "eventbrite", action_type: "listing_live" },
    ],
  },
  {
    daysBefore: 42,
    channels: [
      { channel: "newsletter", action_type: "announce" },
      { channel: "facebook", action_type: "event_created" },
      { channel: "meetup", action_type: "event_created" },
    ],
  },
  {
    daysBefore: 28,
    channels: [
      { channel: "newsletter", action_type: "reminder" },
      { channel: "social_media", action_type: "reminder" },
      { channel: "facebook", action_type: "reminder" },
    ],
  },
  {
    daysBefore: 21,
    channels: [
      { channel: "newsletter", action_type: "reminder" },
      { channel: "social_media", action_type: "reminder" },
    ],
  },
  {
    daysBefore: 14,
    channels: [
      { channel: "newsletter", action_type: "final_push" },
      { channel: "social_media", action_type: "final_push" },
      { channel: "facebook", action_type: "final_push" },
      { channel: "meetup", action_type: "final_push" },
    ],
  },
  {
    daysBefore: 7,
    channels: [
      { channel: "newsletter", action_type: "last_call" },
      { channel: "social_media", action_type: "last_call" },
      { channel: "sms", action_type: "reminder" },
    ],
  },
  {
    daysBefore: 1,
    channels: [{ channel: "sms", action_type: "final_reminder" }],
  },
];

const FRAMEWORK_MEDIUM: OffsetEntry[] = [
  {
    daysBefore: 28,
    channels: [
      { channel: "website", action_type: "announce" },
      { channel: "eventbrite", action_type: "listing_live" },
    ],
  },
  {
    daysBefore: 21,
    channels: [
      { channel: "newsletter", action_type: "announce" },
      { channel: "facebook", action_type: "event_created" },
    ],
  },
  {
    daysBefore: 14,
    channels: [
      { channel: "newsletter", action_type: "reminder" },
      { channel: "social_media", action_type: "reminder" },
      { channel: "facebook", action_type: "reminder" },
    ],
  },
  {
    daysBefore: 7,
    channels: [
      { channel: "newsletter", action_type: "final_push" },
      { channel: "social_media", action_type: "final_push" },
      { channel: "sms", action_type: "reminder" },
    ],
  },
  {
    daysBefore: 1,
    channels: [{ channel: "sms", action_type: "final_reminder" }],
  },
];

const FRAMEWORK_SMALL: OffsetEntry[] = [
  {
    daysBefore: 14,
    channels: [
      { channel: "website", action_type: "announce" },
      { channel: "newsletter", action_type: "announce" },
    ],
  },
  {
    daysBefore: 7,
    channels: [
      { channel: "social_media", action_type: "reminder" },
      { channel: "newsletter", action_type: "reminder" },
    ],
  },
  {
    daysBefore: 0,
    channels: [{ channel: "sms", action_type: "day_of" }],
  },
];

function frameworkFor(eventType: EventType | null): OffsetEntry[] {
  switch (eventType) {
    case "teaching":
    case "empowerment":
    case "retreat":
      return FRAMEWORK_BIG;
    case "fundraiser":
      return FRAMEWORK_MEDIUM;
    case "community":
    case "other":
    case null:
    case undefined:
    default:
      return FRAMEWORK_SMALL;
  }
}

function isoSubtractDays(iso: string, days: number): string | null {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Generate the promotional timeline for an event.
 *
 *  - Returns items dated >= today (so re-running on an already-promoted event
 *    won't recreate items that should have already happened).
 *  - Each item is a separate row even if the same channel fires more than
 *    once across the timeline.
 *  - Returns [] if there's no start_date.
 */
export function generateTimeline(args: {
  event_type: EventType | null;
  start_date: string | null;
  today: string;
}): PromoTimelineItem[] {
  const { event_type, start_date, today } = args;
  if (!start_date) return [];

  const framework = frameworkFor(event_type);
  const out: PromoTimelineItem[] = [];

  for (const entry of framework) {
    const targetDate = isoSubtractDays(start_date, entry.daysBefore);
    if (!targetDate) continue;
    if (targetDate < today) continue;

    for (const c of entry.channels) {
      out.push({
        channel: c.channel,
        action_type: c.action_type,
        target_date: targetDate,
      });
    }
  }

  return out;
}

/**
 * Pretty label for the promotional framework choice — used in the confirm
 * dialog for the "Generate schedule" button.
 */
export function frameworkLabel(eventType: EventType | null): string {
  switch (eventType) {
    case "teaching":
    case "empowerment":
    case "retreat":
      return "8-week (large event)";
    case "fundraiser":
      return "4-week (fundraiser)";
    case "community":
    case "other":
    default:
      return "2-week (community / regular)";
  }
}
