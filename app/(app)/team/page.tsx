import { redirect } from "next/navigation";
import { DisplayNameEditor } from "@/components/team/DisplayNameEditor";
import { InviteForm } from "@/components/team/InviteForm";
import { TeamList } from "@/components/team/TeamList";
import { listTeamMembers } from "@/lib/team/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const [members] = await Promise.all([listTeamMembers()]);

  const me = members.find((m) => m.id === user.id);
  const myDisplayName = me?.display_name ?? user.email?.split("@")[0] ?? "";

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground">
          Manage who has access to EventFlow.
        </p>
      </header>

      <DisplayNameEditor
        initialName={myDisplayName}
        email={user.email ?? null}
      />

      <InviteForm />

      <TeamList members={members} currentUserId={user.id} />
    </div>
  );
}
