import { NextResponse, type NextRequest } from "next/server";
import {
  anthropic,
  buildPromoDraftPrompt,
  LONG_FORM_MAX_TOKENS,
  MODEL_ID,
} from "@/lib/claude";
import {
  getActionTypeLabel,
  getCalendarChannelMeta,
  parseEventRow,
} from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Streams a Claude-drafted piece of content for a single promotional item.
 *
 *  - The body of the response is plain text (the draft).
 *  - On stream close, the assembled text is persisted to the item's `content`
 *    column and the status is bumped to `drafted`. This guarantees a saved
 *    record even if the client disconnects mid-stream.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: itemRow, error: itemError } = await supabase
    .from("promotional_items")
    .select(
      "id, event_id, channel, action_type, target_date, status, content, created_at",
    )
    .eq("id", id)
    .single();
  if (itemError || !itemRow) {
    return NextResponse.json(
      { error: itemError?.message ?? "item not found" },
      { status: 404 },
    );
  }

  const { data: rawEvent, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("id", itemRow.event_id)
    .single();
  if (eventError || !rawEvent) {
    return NextResponse.json(
      { error: eventError?.message ?? "event not found" },
      { status: 404 },
    );
  }
  const event = parseEventRow(rawEvent);

  const today = new Date().toISOString().slice(0, 10);
  const targetDate = itemRow.target_date as string;
  const daysUntil = (() => {
    if (!event.start_date) return 0;
    const start = new Date(`${event.start_date}T00:00:00Z`).getTime();
    const todayMs = new Date(`${today}T00:00:00Z`).getTime();
    return Math.round((start - todayMs) / (1000 * 60 * 60 * 24));
  })();

  const channelLabel = getCalendarChannelMeta(itemRow.channel as string).label;
  const actionLabel = getActionTypeLabel(itemRow.action_type as string);

  const prompt = buildPromoDraftPrompt({
    event,
    today,
    daysUntil,
    channel: channelLabel,
    actionType: actionLabel,
    targetDate,
  });

  const stream = await anthropic.messages.stream({
    model: MODEL_ID,
    max_tokens: LONG_FORM_MAX_TOKENS,
    system: `You are the LRDC EventFlow content drafting assistant. Output only the draft text — no preamble, no commentary.`,
    messages: [{ role: "user", content: prompt }],
  });

  const encoder = new TextEncoder();
  let buffer = "";

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            buffer += chunk.delta.text;
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
      } catch (err) {
        const note = `\n\n[stream error: ${
          err instanceof Error ? err.message : String(err)
        }]`;
        buffer += note;
        controller.enqueue(encoder.encode(note));
      } finally {
        controller.close();
        if (buffer.trim()) {
          await supabase
            .from("promotional_items")
            .update({
              content: buffer,
              status:
                itemRow.status === "sent" ? itemRow.status : "drafted",
            })
            .eq("id", id);
        }
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
