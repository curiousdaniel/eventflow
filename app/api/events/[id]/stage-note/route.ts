import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  anthropic,
  buildStageTransitionPrompt,
  DEFAULT_MAX_TOKENS,
  MODEL_ID,
} from "@/lib/claude";
import { EventStageEnum, parseEventRow, STAGE_LABELS } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  targetStage: EventStageEnum,
});

/**
 * Generates a "what to do next" note from Claude after a stage advance and
 * persists it to event_messages so it shows up in the sidebar transcript.
 *
 * Called fire-and-forget by StageAdvanceButton — failures here must not
 * surface to the user beyond the absence of a note in the sidebar.
 */
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

  // The stage advance has already happened by the time this route is called,
  // so event.stage is the *new* stage. We need to derive the previous stage
  // for the prompt; that's just the one before targetStage in the linear list.
  const newStage = parsed.targetStage;
  const prevStage = (() => {
    const stages = [
      "seed",
      "planning",
      "confirmed",
      "in_promotion",
      "active",
      "complete",
    ] as const;
    const idx = stages.indexOf(newStage);
    return idx > 0 ? stages[idx - 1] : newStage;
  })();

  const today = new Date().toISOString().slice(0, 10);
  const userPrompt = buildStageTransitionPrompt(
    event,
    STAGE_LABELS[prevStage],
    STAGE_LABELS[newStage],
    today,
  );

  let noteText: string;
  try {
    const result = await anthropic.messages.create({
      model: MODEL_ID,
      max_tokens: DEFAULT_MAX_TOKENS,
      system: `You are the planning assistant for Lion's Roar Dharma Center, embedded in EventFlow. Be concise and concrete.`,
      messages: [{ role: "user", content: userPrompt }],
    });
    noteText = result.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n")
      .trim();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "claude error" },
      { status: 502 },
    );
  }

  if (!noteText) {
    return NextResponse.json({ ok: true, persisted: false });
  }

  const prefixed = `**Stage advanced: ${STAGE_LABELS[prevStage]} → ${STAGE_LABELS[newStage]}**\n\n${noteText}`;

  const { error: insertError } = await supabase.from("event_messages").insert({
    event_id: eventId,
    role: "assistant",
    content: prefixed,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, persisted: true });
}
