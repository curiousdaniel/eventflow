"use client";

import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { STAGE_LABELS, type EventStage } from "@/lib/schemas";
import type { RequirementRule } from "@/lib/completeness";

interface StageAdvanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetStage: EventStage;
  missing: RequirementRule[];
  onProceed: () => void;
}

export function StageAdvanceDialog({
  open,
  onOpenChange,
  targetStage,
  missing,
  onProceed,
}: StageAdvanceDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-500" aria-hidden />
            Advance to {STAGE_LABELS[targetStage]}?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                This event is missing the following items normally required to
                reach the <strong>{STAGE_LABELS[targetStage]}</strong> stage:
              </p>
              <ul className="ml-5 list-disc space-y-1 text-sm">
                {missing.map((rule) => (
                  <li key={rule.id}>{rule.label}</li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                You can proceed anyway and fill these in later.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onProceed}>
            Proceed anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
