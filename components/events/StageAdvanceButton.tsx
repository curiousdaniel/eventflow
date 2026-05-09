"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { STAGE_LABELS, nextStage, type EventRow } from "@/lib/schemas";
import { getMissingForNextStage } from "@/lib/completeness";
import { advanceStage } from "@/lib/events/actions";
import { StageAdvanceDialog } from "@/components/events/StageAdvanceDialog";

export function StageAdvanceButton({ event }: { event: EventRow }) {
  const router = useRouter();
  const [advancing, setAdvancing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const target = nextStage(event.stage);
  if (!target) return null;

  const missingInfo = getMissingForNextStage(event);
  const hasMissing = !!(missingInfo && missingInfo.missing.length > 0);

  async function performAdvance() {
    if (!target) return;
    setAdvancing(true);
    try {
      await advanceStage(event.id, target);
      toast.success(`Advanced to ${STAGE_LABELS[target]}`);

      // Fire-and-forget: ask Claude for a stage-transition note. We do not
      // block the UI on this — the note will appear in the sidebar history
      // once Claude responds.
      void fetch(`/api/events/${event.id}/stage-note`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetStage: target }),
      })
        .catch(() => {
          // Swallow errors; this is purely advisory.
        })
        .finally(() => {
          router.refresh();
        });

      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Advance failed");
    } finally {
      setAdvancing(false);
      setConfirmOpen(false);
    }
  }

  function handleClick() {
    if (hasMissing) {
      setConfirmOpen(true);
      return;
    }
    void performAdvance();
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleClick}
        disabled={advancing}
        className="gap-1"
      >
        {advancing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ArrowUpRight className="size-4" />
        )}
        Advance to {STAGE_LABELS[target]}
      </Button>

      {missingInfo ? (
        <StageAdvanceDialog
          open={confirmOpen}
          onOpenChange={(open) => {
            if (!advancing) setConfirmOpen(open);
          }}
          targetStage={missingInfo.stage}
          missing={missingInfo.missing}
          onProceed={() => void performAdvance()}
        />
      ) : null}
    </>
  );
}
