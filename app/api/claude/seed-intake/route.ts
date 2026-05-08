import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  anthropic,
  DEFAULT_MAX_TOKENS,
  MODEL_ID,
  SEED_INTAKE_SYSTEM_PROMPT,
} from "@/lib/claude";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ChatMessage = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const Body = z.object({
  messages: z.array(ChatMessage).min(1),
});

export async function POST(req: NextRequest) {
  // Auth gate — only signed-in LRDC admins should be hitting Claude.
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

  const stream = await anthropic.messages.stream({
    model: MODEL_ID,
    max_tokens: DEFAULT_MAX_TOKENS,
    system: SEED_INTAKE_SYSTEM_PROMPT,
    messages: parsed.messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `\n\n[stream error: ${err instanceof Error ? err.message : String(err)}]`,
          ),
        );
      } finally {
        controller.close();
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
