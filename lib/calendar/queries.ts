import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  PromotionalItemRowSchema,
  type EventRow,
  type PromotionalItemRow,
} from "@/lib/schemas";

export interface CalendarItem extends PromotionalItemRow {
  event_title: string;
  event_stage: EventRow["stage"];
  event_start_date: string | null;
}

interface ListPromoItemsArgs {
  /** Inclusive YYYY-MM-DD bound. Optional. */
  from?: string;
  /** Inclusive YYYY-MM-DD bound. Optional. */
  to?: string;
  /** Restrict to a single event. Optional. */
  eventId?: string;
}

/**
 * Fetch promotional items in a date window with their parent event hydrated
 * for display. Sorted by target_date ascending so the calendar can group
 * straightforwardly.
 */
export async function listPromoItems(
  args: ListPromoItemsArgs = {},
): Promise<CalendarItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("promotional_items")
    .select(
      "id, event_id, channel, action_type, target_date, status, content, created_at, events:events(id, title, stage, start_date)",
    )
    .order("target_date", { ascending: true });

  if (args.from) query = query.gte("target_date", args.from);
  if (args.to) query = query.lte("target_date", args.to);
  if (args.eventId) query = query.eq("event_id", args.eventId);

  const { data, error } = await query;
  if (error || !data) return [];

  const out: CalendarItem[] = [];
  for (const raw of data as unknown as Array<Record<string, unknown>>) {
    const evt = pickEvent(raw.events);
    try {
      const parsed = PromotionalItemRowSchema.parse({
        id: raw.id,
        event_id: raw.event_id,
        channel: raw.channel,
        action_type: raw.action_type,
        target_date: raw.target_date,
        status: raw.status,
        content: raw.content ?? null,
        created_at: raw.created_at,
      });
      out.push({
        ...parsed,
        event_title: evt?.title ?? "Untitled event",
        event_stage: (evt?.stage ?? "seed") as EventRow["stage"],
        event_start_date: evt?.start_date ?? null,
      });
    } catch {
      // Skip malformed rows.
    }
  }
  return out;
}

/**
 * Supabase types nested foreign-key rows as either a single object or an
 * array depending on the relationship. Normalise to the singular shape we
 * actually want.
 */
function pickEvent(value: unknown): {
  id?: string;
  title?: string;
  stage?: string;
  start_date?: string | null;
} | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    return (value[0] as { [k: string]: unknown }) ?? null;
  }
  return value as { [k: string]: unknown };
}

/**
 * Lightweight events list for the calendar's "filter by event" dropdown.
 */
export async function listEventsForCalendarFilter(): Promise<
  Array<{ id: string; title: string; start_date: string | null }>
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, title, start_date")
    .order("start_date", { ascending: true, nullsFirst: false });
  if (error || !data) return [];
  return data as Array<{
    id: string;
    title: string;
    start_date: string | null;
  }>;
}

export async function getPromoItemById(
  id: string,
): Promise<CalendarItem | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promotional_items")
    .select(
      "id, event_id, channel, action_type, target_date, status, content, created_at, events:events(id, title, stage, start_date)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  const raw = data as unknown as Record<string, unknown>;
  const evt = pickEvent(raw.events);

  try {
    const parsed = PromotionalItemRowSchema.parse({
      id: raw.id,
      event_id: raw.event_id,
      channel: raw.channel,
      action_type: raw.action_type,
      target_date: raw.target_date,
      status: raw.status,
      content: raw.content ?? null,
      created_at: raw.created_at,
    });
    return {
      ...parsed,
      event_title: evt?.title ?? "Untitled event",
      event_stage: (evt?.stage ?? "seed") as EventRow["stage"],
      event_start_date: evt?.start_date ?? null,
    };
  } catch {
    return null;
  }
}
