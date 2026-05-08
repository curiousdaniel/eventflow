"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  EVENT_STAGES,
  EventStageEnum,
  EventTypeEnum,
  PANEL_SCHEMAS,
  PanelKeyEnum,
  parseEventRow,
  type EventRow,
  type EventStage,
  type PanelKey,
} from "@/lib/schemas";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/signin");
  }
  return { supabase, user };
}

async function loadEvent(eventId: string): Promise<EventRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Event not found");
  }
  return parseEventRow(data);
}

/**
 * Take a full snapshot of an event into event_history. Called after every
 * write so the iteration log is complete.
 */
async function writeHistorySnapshot(
  eventId: string,
  changedBy: string,
  note?: string,
) {
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();
  if (error || !row) return;
  await supabase.from("event_history").insert({
    event_id: eventId,
    snapshot: row,
    changed_by: changedBy,
    note: note ?? null,
  });
}

// -----------------------------------------------------------------------------
// Create event (used by /events/new — both Claude flow and quick form)
// -----------------------------------------------------------------------------
const CreateEventInput = z.object({
  title: z.string().min(1).default("Untitled Event"),
  event_type: EventTypeEnum.optional().nullable(),
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
export type CreateEventInput = z.infer<typeof CreateEventInput>;

export async function createEvent(input: CreateEventInput): Promise<string> {
  const parsed = CreateEventInput.parse(input);
  const { supabase, user } = await requireUser();

  const insertRow = {
    title: parsed.title.trim() || "Untitled Event",
    event_type: parsed.event_type ?? null,
    start_date: parsed.start_date ?? null,
    end_date: parsed.end_date ?? null,
    core: parsed.core ?? {},
    created_by: user.id,
  };

  const { data, error } = await supabase
    .from("events")
    .insert(insertRow)
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create event");
  }

  await writeHistorySnapshot(data.id, user.id, "Event created");
  revalidatePath("/dashboard");
  return data.id;
}

// -----------------------------------------------------------------------------
// Update event title (top-bar inline edit)
// -----------------------------------------------------------------------------
export async function updateEventTitle(eventId: string, title: string) {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Title cannot be empty");

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("events")
    .update({ title: trimmed })
    .eq("id", eventId);
  if (error) throw new Error(error.message);

  await writeHistorySnapshot(eventId, user.id, `Title updated`);
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/dashboard");
}

// -----------------------------------------------------------------------------
// Update top-level event date / event_type
// -----------------------------------------------------------------------------
const TopLevelUpdate = z.object({
  event_type: EventTypeEnum.nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
});

export async function updateEventTopLevel(
  eventId: string,
  patch: z.infer<typeof TopLevelUpdate>,
) {
  const parsed = TopLevelUpdate.parse(patch);
  const { supabase, user } = await requireUser();

  const update: Record<string, unknown> = {};
  if ("event_type" in parsed) update.event_type = parsed.event_type ?? null;
  if ("start_date" in parsed) update.start_date = parsed.start_date ?? null;
  if ("end_date" in parsed) update.end_date = parsed.end_date ?? null;

  const { error } = await supabase
    .from("events")
    .update(update)
    .eq("id", eventId);
  if (error) throw new Error(error.message);

  const labels = Object.keys(parsed).join(", ");
  await writeHistorySnapshot(eventId, user.id, `Updated: ${labels}`);
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/dashboard");
}

// -----------------------------------------------------------------------------
// Update a single panel (core / logistics / approvals / publicity / etc.)
//
// Caller passes the panel key plus a partial of that panel's shape; we merge
// it onto whatever's already stored, validate via the panel's Zod schema, and
// write the new value.
// -----------------------------------------------------------------------------
export async function updateEventPanel(
  eventId: string,
  panel: PanelKey,
  patch: Record<string, unknown>,
) {
  PanelKeyEnum.parse(panel);
  const { supabase, user } = await requireUser();

  const event = await loadEvent(eventId);
  const merged = { ...(event[panel] as Record<string, unknown>), ...patch };
  const validated = PANEL_SCHEMAS[panel].parse(merged);

  const { error } = await supabase
    .from("events")
    .update({ [panel]: validated })
    .eq("id", eventId);
  if (error) throw new Error(error.message);

  await writeHistorySnapshot(
    eventId,
    user.id,
    `${panel} updated: ${Object.keys(patch).join(", ")}`,
  );
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/dashboard");
}

// -----------------------------------------------------------------------------
// Advance stage. The full guard-rail UX (modal, "proceed anyway") and the
// Claude "next-steps" follow-up are Phase 3 — Phase 2 just records the
// transition with a history snapshot.
// -----------------------------------------------------------------------------
export async function advanceStage(
  eventId: string,
  toStage: EventStage,
  options: { skipChecks?: boolean } = {},
) {
  EventStageEnum.parse(toStage);
  void options;
  const { supabase, user } = await requireUser();

  const event = await loadEvent(eventId);
  const fromStage = event.stage;

  const fromIdx = EVENT_STAGES.indexOf(fromStage);
  const toIdx = EVENT_STAGES.indexOf(toStage);
  if (toIdx <= fromIdx) {
    throw new Error("Cannot advance to an earlier or current stage");
  }

  const { error } = await supabase
    .from("events")
    .update({ stage: toStage })
    .eq("id", eventId);
  if (error) throw new Error(error.message);

  await writeHistorySnapshot(
    eventId,
    user.id,
    `Stage advanced: ${fromStage} → ${toStage}`,
  );
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/dashboard");
}

// Note: this module is "use server", so it can only export async functions.
// Constants / types live in @/lib/schemas — import them from there.
