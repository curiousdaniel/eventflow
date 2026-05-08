import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-shell/AppSidebar";
import { TopBar } from "@/components/app-shell/TopBar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  // Defensive: if the trigger hasn't been applied yet, ensure a profile row.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("id", user.id)
    .maybeSingle();

  let displayName = profile?.display_name ?? "";
  if (!profile) {
    const fallback = user.email?.split("@")[0] ?? "";
    await supabase.from("profiles").upsert(
      { id: user.id, display_name: fallback },
      { onConflict: "id", ignoreDuplicates: true },
    );
    displayName = fallback;
  }

  return (
    <div className="flex h-svh">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar displayName={displayName} email={user.email ?? ""} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
