import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { PromoStatusEnum } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Patch = z.object({
  status: PromoStatusEnum.optional(),
  content: z.string().nullable().optional(),
  target_date: z.string().min(1).optional(),
});

export async function PATCH(
  req: NextRequest,
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

  let parsed;
  try {
    parsed = Patch.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "bad request" },
      { status: 400 },
    );
  }

  if (Object.keys(parsed).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (parsed.status !== undefined) update.status = parsed.status;
  if (parsed.content !== undefined) update.content = parsed.content;
  if (parsed.target_date !== undefined) update.target_date = parsed.target_date;

  const { data, error } = await supabase
    .from("promotional_items")
    .update(update)
    .eq("id", id)
    .select(
      "id, event_id, channel, action_type, target_date, status, content, created_at",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data });
}

export async function DELETE(
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

  const { error } = await supabase
    .from("promotional_items")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
