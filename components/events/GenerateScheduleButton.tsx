"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { frameworkLabel } from "@/lib/promo-timeline";
import type { EventRow } from "@/lib/schemas";

export function GenerateScheduleButton({ event }: { event: EventRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleGenerate() {
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${event.id}/generate-promo`, {
        method: "POST",
      });
      const json = (await res.json().catch(() => ({}))) as {
        inserted?: number;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      toast.success(
        json.inserted
          ? `Generated ${json.inserted} promotional item${json.inserted === 1 ? "" : "s"}`
          : "Schedule generated (no future items needed)",
      );
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate schedule",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <AlertDialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="gap-1">
          <CalendarPlus className="size-4" />
          Generate schedule
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Generate promotional schedule?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                This will generate a {frameworkLabel(event.event_type)}{" "}
                promotional schedule based on the event start date
                {event.start_date ? ` (${event.start_date})` : ""}.
              </p>
              <p className="text-xs text-muted-foreground">
                Existing <strong>pending</strong> items will be replaced. Items
                that have already been drafted or sent are kept.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              void handleGenerate();
            }}
          >
            {busy ? (
              <>
                <Loader2 className="mr-1 size-4 animate-spin" />
                Generating…
              </>
            ) : (
              "Generate"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
