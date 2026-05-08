import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("redirect") ?? "/dashboard";

  if (!code) {
    url.pathname = "/signin";
    url.searchParams.set("error", "missing_code");
    return NextResponse.redirect(url);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    url.pathname = "/signin";
    url.searchParams.delete("code");
    url.searchParams.set("error", error.message);
    return NextResponse.redirect(url);
  }

  // Defensive profile upsert. The on_auth_user_created Postgres trigger
  // already does this on first sign-in, but if the trigger hasn't been
  // applied yet we still want sign-in to leave the user with a profile row.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const fallbackName = user.email?.split("@")[0] ?? "";
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        display_name:
          (user.user_metadata?.display_name as string | undefined) ??
          fallbackName,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
  }

  url.pathname = next.startsWith("/") ? next : "/dashboard";
  url.search = "";
  return NextResponse.redirect(url);
}
