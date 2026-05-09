"use client";

import { useState, useTransition } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteByEmail } from "@/lib/team/actions";

export function InviteForm() {
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    startTransition(async () => {
      try {
        await inviteByEmail({ email: trimmed });
        toast.success(`Invitation sent to ${trimmed}`);
        setEmail("");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to send invitation",
        );
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border bg-card p-5"
    >
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Invite a team member</h2>
        <p className="text-sm text-muted-foreground">
          Send a magic-link invitation by email. They&apos;ll get a one-click
          sign-in and a profile row will be created automatically.
        </p>
      </div>
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="someone@example.com"
            required
            disabled={pending}
          />
        </div>
        <Button type="submit" disabled={pending || !email.trim()} className="gap-1">
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <UserPlus className="size-4" />
          )}
          Send invitation
        </Button>
      </div>
    </form>
  );
}
