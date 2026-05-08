import "server-only";
import { createClient } from "@/lib/supabase/server";
import { parseEventRow, type EventRow } from "@/lib/schemas";

export async function getEventById(id: string): Promise<EventRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  try {
    return parseEventRow(data);
  } catch {
    return null;
  }
}

export interface EventListItem {
  id: string;
  title: string;
  stage: EventRow["stage"];
  event_type: EventRow["event_type"];
  start_date: string | null;
  updated_at: string;
}

export async function listEvents(): Promise<EventRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  const out: EventRow[] = [];
  for (const row of data) {
    try {
      out.push(parseEventRow(row));
    } catch {
      // Skip malformed rows rather than blowing up the dashboard.
    }
  }
  return out;
}

export interface EventMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_by: string | null;
  created_at: string;
}

export async function getEventMessages(
  eventId: string,
): Promise<EventMessage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_messages")
    .select("id, role, content, created_by, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data as EventMessage[];
}

export interface EventHistoryEntry {
  id: string;
  event_id: string;
  snapshot: unknown;
  changed_by: string | null;
  note: string | null;
  created_at: string;
  changed_by_name: string | null;
}

export async function getEventHistory(
  eventId: string,
): Promise<EventHistoryEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_history")
    .select("id, event_id, snapshot, changed_by, note, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];

  // Hydrate display names. Phase 5 will replace this with a join, but the
  // dataset is small enough for a follow-up query.
  const ids = Array.from(
    new Set(
      (data as Array<{ changed_by: string | null }>)
        .map((r) => r.changed_by)
        .filter((id): id is string => id !== null),
    ),
  );
  let nameMap = new Map<string, string>();
  if (ids.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", ids);
    nameMap = new Map(
      (profiles ?? []).map((p) => [
        p.id as string,
        (p.display_name as string) || "",
      ]),
    );
  }

  return (data as EventHistoryEntry[]).map((row) => ({
    ...row,
    changed_by_name: row.changed_by ? (nameMap.get(row.changed_by) ?? null) : null,
  }));
}
