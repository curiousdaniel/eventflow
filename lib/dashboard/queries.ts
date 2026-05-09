import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface ActivityEntry {
  id: string;
  event_id: string;
  event_title: string;
  note: string | null;
  changed_by: string | null;
  changed_by_name: string | null;
  created_at: string;
}

/**
 * Cross-event activity feed: most recent N event_history entries with the
 * event title and the actor's display name hydrated.
 */
export async function getRecentActivity(limit = 10): Promise<ActivityEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("event_history")
    .select("id, event_id, note, changed_by, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  const rows = data as Array<{
    id: string;
    event_id: string;
    note: string | null;
    changed_by: string | null;
    created_at: string;
  }>;

  if (rows.length === 0) return [];

  const eventIds = Array.from(new Set(rows.map((r) => r.event_id)));
  const userIds = Array.from(
    new Set(rows.map((r) => r.changed_by).filter((v): v is string => !!v)),
  );

  const [eventsRes, profilesRes] = await Promise.all([
    supabase.from("events").select("id, title").in("id", eventIds),
    userIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds)
      : Promise.resolve({ data: [] as Array<{ id: string; display_name: string }> }),
  ]);

  const titleMap = new Map(
    ((eventsRes.data ?? []) as Array<{ id: string; title: string }>).map(
      (e) => [e.id, e.title],
    ),
  );
  const nameMap = new Map(
    ((profilesRes.data ?? []) as Array<{ id: string; display_name: string }>)
      .map((p) => [p.id, p.display_name || ""]),
  );

  return rows.map((r) => ({
    id: r.id,
    event_id: r.event_id,
    event_title: titleMap.get(r.event_id) ?? "Untitled event",
    note: r.note,
    changed_by: r.changed_by,
    changed_by_name: r.changed_by ? (nameMap.get(r.changed_by) ?? null) : null,
    created_at: r.created_at,
  }));
}
