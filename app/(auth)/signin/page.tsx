"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function SignInPage() {
  return (
    <Suspense>
      <SignInPageInner />
    </Suspense>
  );
}

function SignInPageInner() {
  const searchParams = useSearchParams();
  const callbackError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) return;

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setSent(true);
      toast.success("Magic link sent. Check your inbox.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl">EventFlow</CardTitle>
          <CardDescription>
            Lion&apos;s Roar Dharma Center event planning
          </CardDescription>
        </CardHeader>

        {callbackError ? (
          <div className="px-6 pb-2">
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Sign-in failed</AlertTitle>
              <AlertDescription>{callbackError}</AlertDescription>
            </Alert>
          </div>
        ) : null}

        {sent ? (
          <CardContent className="space-y-3 text-center">
            <p className="text-sm">
              We sent a magic link to{" "}
              <span className="font-medium">{email}</span>.
            </p>
            <p className="text-sm text-muted-foreground">
              Click the link in your email to sign in. You can close this tab.
            </p>
            <Button
              type="button"
              variant="ghost"
              className="mt-2"
              onClick={() => {
                setSent(false);
                setEmail("");
              }}
            >
              Use a different email
            </Button>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                We&apos;ll email you a magic link. No passwords.
              </p>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full"
                disabled={submitting || !email.trim()}
              >
                {submitting ? "Sending…" : "Send magic link"}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </main>
  );
}
