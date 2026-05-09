"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");
  return { supabase, user };
}

const InviteInput = z.object({
  email: z.string().email(),
});

/**
 * Invite a new user to the team by email. Uses the service-role admin client
 * to call Supabase's auth.admin.inviteUserByEmail, which sends a branded
 * invitation email with a magic link to the configured Site URL.
 *
 * The on_auth_user_created trigger will create their profile row when they
 * accept the invitation and sign in.
 */
export async function inviteByEmail(input: { email: string }) {
  const parsed = InviteInput.parse(input);
  await requireUser();

  const admin = createAdminClient();
  const redirectTo = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
    : undefined;

  const { error } = await admin.auth.admin.inviteUserByEmail(
    parsed.email,
    redirectTo ? { redirectTo } : undefined,
  );

  if (error) {
    // Idempotency: re-inviting an existing user is fine, surface a friendlier
    // error for that case.
    if (/already been registered|already exists/i.test(error.message)) {
      throw new Error(
        "That email is already registered. They can sign in via the normal magic-link flow.",
      );
    }
    throw new Error(error.message);
  }

  revalidatePath("/team");
}

const DisplayNameInput = z.object({
  display_name: z.string().min(1).max(80),
});

export async function updateMyDisplayName(input: { display_name: string }) {
  const parsed = DisplayNameInput.parse(input);
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.display_name.trim() })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/team");
  revalidatePath("/dashboard");
}
