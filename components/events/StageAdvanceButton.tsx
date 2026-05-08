"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { STAGE_LABELS, nextStage, type EventRow } from "@/lib/schemas";
import { getMissingForNextStage } from "@/lib/completeness";
import { advanceStage } from "@/lib/events/actions";

/**
 * Phase 2: simple "advance to next stage" button. If required fields are
 * missing, we surface them in a toast and refuse to advance.
 *
 * Phase 3 will replace this with the warning modal that lets the user
 * "proceed anyway", and will trigger Claude to generate a "next steps" note.
 */
export function StageAdvanceButton({ event }: { event: EventRow }) {
  const router = useRouter();
  const [advancing, setAdvancing] = useState(false);

  const target = nextStage(event.stage);
  if (!target) return null;

  const missingInfo = getMissingForNextStage(event);

  async function handleClick() {
    if (!target) return;

    if (missingInfo && missingInfo.missing.length > 0) {
      toast.warning(
        `Cannot advance to ${STAGE_LABELS[missingInfo.stage]} yet`,
        {
          description: `Missing: ${missingInfo.missing
            .map((r) => r.label)
            .join(", ")}`,
        },
      );
      return;
    }

    setAdvancing(true);
    try {
      await advanceStage(event.id, target);
      toast.success(`Advanced to ${STAGE_LABELS[target]}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Advance failed");
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => void handleClick()}
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
  );
}
