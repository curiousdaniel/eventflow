import { NextResponse, type NextRequest } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth callback handler.
 *
 * Supabase sends users back here after they click a link in their inbox.
 * Several flows land on this same URL with different params:
 *
 *   - PKCE magic link / OTP:    ?code=<authorization_code>
 *   - Email confirmation /
 *     magic link (token flow):  ?token_hash=<hash>&type=<signup|email|magiclink|recovery|invite|email_change>
 *   - Failures from upstream:   ?error=...&error_description=...
 *
 * If the project has "Confirm email" enabled in Supabase auth settings, the
 * very first sign-in for any address comes through the token_hash flow with
 * type=signup; subsequent sign-ins use the magic-link / PKCE flow. We handle
 * both so things work either way.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const upstreamError =
    url.searchParams.get("error_description") ?? url.searchParams.get("error");
  const next = url.searchParams.get("redirect") ?? "/dashboard";

  // Forward any error Supabase sent us straight back to /signin.
  if (upstreamError) {
    return redirectToSignin(url, upstreamError);
  }

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return redirectToSignin(url, error.message);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (error) return redirectToSignin(url, error.message);
  } else {
    return redirectToSignin(url, "missing_code");
  }

  // Defensive profile upsert. The on_auth_user_created Postgres trigger
  // already creates a row on first sign-in; this handles the case where the
  // trigger hasn't been applied yet (or the user was created out-of-band).
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

function redirectToSignin(url: URL, error: string) {
  const out = new URL(url.toString());
  out.pathname = "/signin";
  out.search = "";
  out.searchParams.set("error", error);
  return NextResponse.redirect(out);
}
