import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface TeamMember {
  id: string;
  display_name: string;
  email: string | null;
  created_at: string;
  last_seen_at: string | null;
  last_active_at: string | null;
}

/**
 * List every team member (every profile row), hydrated with:
 *  - email + last_sign_in_at from auth.users (admin-scoped)
 *  - last_active_at from event_history (most recent change attributed to them)
 *
 * RLS keeps the profiles table itself readable to authenticated users; we use
 * the service-role admin client only to read auth.users for emails.
 */
export async function listTeamMembers(): Promise<TeamMember[]> {
  const supabase = await createClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, display_name, created_at")
    .order("created_at", { ascending: true });

  if (error || !profiles) return [];

  // Fetch auth.users via the admin client to get emails + last sign-in.
  let authUsers: Array<{
    id: string;
    email: string | null;
    last_sign_in_at: string | null;
  }> = [];
  try {
    const admin = createAdminClient();
    // listUsers paginates; for a small dharma center one page is plenty.
    const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
    authUsers = (data?.users ?? []).map((u) => ({
      id: u.id,
      email: u.email ?? null,
      last_sign_in_at: u.last_sign_in_at ?? null,
    }));
  } catch {
    // If service role isn't configured, fall through with no email data —
    // the page still renders display names.
  }

  const authMap = new Map(authUsers.map((u) => [u.id, u]));

  // Most recent event_history change per user.
  const { data: lastChanges } = await supabase
    .from("event_history")
    .select("changed_by, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  const lastActiveMap = new Map<string, string>();
  for (const row of (lastChanges ?? []) as Array<{
    changed_by: string | null;
    created_at: string;
  }>) {
    if (!row.changed_by) continue;
    if (!lastActiveMap.has(row.changed_by)) {
      lastActiveMap.set(row.changed_by, row.created_at);
    }
  }

  return profiles.map((p) => {
    const u = authMap.get(p.id as string);
    return {
      id: p.id as string,
      display_name: (p.display_name as string) || "",
      email: u?.email ?? null,
      created_at: p.created_at as string,
      last_seen_at: u?.last_sign_in_at ?? null,
      last_active_at: lastActiveMap.get(p.id as string) ?? null,
    };
  });
}
