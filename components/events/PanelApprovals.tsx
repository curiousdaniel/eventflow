"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EventRow } from "@/lib/schemas";
import { usePanelSaver } from "@/components/events/usePanelSaver";

export function PanelApprovals({ event }: { event: EventRow }) {
  const { save } = usePanelSaver(event.id, "approvals");

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Checkbox
            id="rinpoche_approved"
            checked={event.approvals.rinpoche_approved}
            onCheckedChange={(checked) => {
              const value = checked === true;
              const today = new Date().toISOString().slice(0, 10);
              const patch: Record<string, unknown> = {
                rinpoche_approved: value,
              };
              if (value && !event.approvals.rinpoche_approved_date) {
                patch.rinpoche_approved_date = today;
              }
              if (!value) {
                patch.rinpoche_approved_date = undefined;
              }
              void save(patch);
            }}
          />
          <Label htmlFor="rinpoche_approved" className="cursor-pointer">
            Rinpoche has approved this event
          </Label>
        </div>
        {event.approvals.rinpoche_approved ? (
          <div className="ml-6 max-w-xs space-y-1">
            <Label
              htmlFor="rinpoche_approved_date"
              className="text-xs text-muted-foreground"
            >
              Approval date
            </Label>
            <Input
              id="rinpoche_approved_date"
              type="date"
              defaultValue={event.approvals.rinpoche_approved_date ?? ""}
              onBlur={(e) =>
                save({
                  rinpoche_approved_date: e.target.value || undefined,
                })
              }
            />
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <Checkbox
          id="admin_approved"
          checked={event.approvals.admin_approved}
          onCheckedChange={(checked) =>
            void save({ admin_approved: checked === true })
          }
        />
        <Label htmlFor="admin_approved" className="cursor-pointer">
          Admin team has signed off
        </Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="approvals-notes">Notes</Label>
        <Textarea
          id="approvals-notes"
          rows={3}
          defaultValue={event.approvals.notes ?? ""}
          onBlur={(e) => save({ notes: e.target.value.trim() || undefined })}
          placeholder="Conditions, follow-up items, etc."
        />
      </div>
    </div>
  );
}
