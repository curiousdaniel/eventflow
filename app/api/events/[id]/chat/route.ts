import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  anthropic,
  buildEventSystemPrompt,
  DEFAULT_MAX_TOKENS,
  MODEL_ID,
} from "@/lib/claude";
import { getEventCompleteness } from "@/lib/completeness";
import { parseEventRow } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  message: z.string().min(1),
});

export async function POST(
  req: NextRequest,
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

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "bad request" },
      { status: 400 },
    );
  }

  // Load event + completeness for the system prompt.
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
  const completeness = getEventCompleteness(event);
  const today = new Date().toISOString().slice(0, 10);
  const system = buildEventSystemPrompt(event, completeness, today);

  // Load prior messages for context.
  const { data: priorMessages } = await supabase
    .from("event_messages")
    .select("role, content")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  // Persist the user's new message before calling Claude.
  await supabase.from("event_messages").insert({
    event_id: eventId,
    role: "user",
    content: parsed.message,
    created_by: user.id,
  });

  const messages = [
    ...((priorMessages ?? []) as Array<{
      role: "user" | "assistant";
      content: string;
    }>),
    { role: "user" as const, content: parsed.message },
  ];

  const stream = await anthropic.messages.stream({
    model: MODEL_ID,
    max_tokens: DEFAULT_MAX_TOKENS,
    system,
    messages,
  });

  const encoder = new TextEncoder();
  let assistantBuffer = "";

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            assistantBuffer += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        const note = `\n\n[stream error: ${
          err instanceof Error ? err.message : String(err)
        }]`;
        assistantBuffer += note;
        controller.enqueue(encoder.encode(note));
      } finally {
        controller.close();
        // Persist the assistant reply after the stream closes. We do this
        // here (not in the for-loop) so partial replies on disconnects
        // still get saved.
        if (assistantBuffer.trim()) {
          await supabase.from("event_messages").insert({
            event_id: eventId,
            role: "assistant",
            content: assistantBuffer,
          });
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
