import { NextResponse, type NextRequest } from "next/server";
import { parseEventRow } from "@/lib/schemas";
import { generateTimeline } from "@/lib/promo-timeline";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Generate the promotional timeline for an event and replace its existing
 * pending items.
 *
 * Behaviour:
 *  - Drops only items still in status='pending'. Drafted/sent items are
 *    preserved so users don't lose work.
 *  - Skips inserting any timeline rows that duplicate a preserved row's
 *    (channel, action_type, target_date) tuple.
 *  - Records a history snapshot on the event so the action shows in the
 *    timeline.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id: eventId } = params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: rawEvent, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();
  if (eventError || !rawEvent) {
    return NextResponse.json(
      { error: eventError?.message ?? "event not found" },
      { status: 404 },
    );
  }
  const event = parseEventRow(rawEvent);

  if (!event.start_date) {
    return NextResponse.json(
      { error: "Cannot generate a promotional schedule without a start date." },
      { status: 400 },
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  const items = generateTimeline({
    event_type: event.event_type,
    start_date: event.start_date,
    today,
  });

  // Wipe pending items. Drafted/sent are preserved.
  const { error: deleteError } = await supabase
    .from("promotional_items")
    .delete()
    .eq("event_id", eventId)
    .eq("status", "pending");
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Load whatever survived so we can dedupe.
  const { data: surviving } = await supabase
    .from("promotional_items")
    .select("channel, action_type, target_date")
    .eq("event_id", eventId);

  const survivingKeys = new Set(
    (surviving ?? []).map(
      (r) => `${r.channel}|${r.action_type}|${r.target_date}`,
    ),
  );

  const toInsert = items
    .filter(
      (i) =>
        !survivingKeys.has(`${i.channel}|${i.action_type}|${i.target_date}`),
    )
    .map((i) => ({
      event_id: eventId,
      channel: i.channel,
      action_type: i.action_type,
      target_date: i.target_date,
      status: "pending" as const,
    }));

  let inserted = 0;
  if (toInsert.length > 0) {
    const { error: insertError, count } = await supabase
      .from("promotional_items")
      .insert(toInsert, { count: "exact" });
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    inserted = count ?? toInsert.length;
  }

  // History snapshot for auditability.
  const { data: rowAfter } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();
  if (rowAfter) {
    await supabase.from("event_history").insert({
      event_id: eventId,
      snapshot: rowAfter,
      changed_by: user.id,
      note: `Promotional schedule generated (${inserted} item${inserted === 1 ? "" : "s"})`,
    });
  }

  return NextResponse.json({ ok: true, inserted, total: items.length });
}
