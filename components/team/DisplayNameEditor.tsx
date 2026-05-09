"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateMyDisplayName } from "@/lib/team/actions";

interface DisplayNameEditorProps {
  initialName: string;
  email: string | null;
}

export function DisplayNameEditor({
  initialName,
  email,
}: DisplayNameEditorProps) {
  const [name, setName] = useState(initialName);
  const [pending, startTransition] = useTransition();

  const dirty = name.trim() !== initialName.trim() && name.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    startTransition(async () => {
      try {
        await updateMyDisplayName({ display_name: name.trim() });
        toast.success("Display name updated");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update display name",
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
        <h2 className="text-base font-semibold">Your profile</h2>
        <p className="text-sm text-muted-foreground">
          {email ? (
            <>
              Signed in as <span className="font-medium">{email}</span>.
            </>
          ) : (
            "Update how you appear across the app."
          )}
        </p>
      </div>

      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="display-name">Display name</Label>
          <Input
            id="display-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
            disabled={pending}
            maxLength={80}
          />
        </div>
        <Button type="submit" disabled={!dirty || pending} className="gap-1">
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save
        </Button>
      </div>
    </form>
  );
}
