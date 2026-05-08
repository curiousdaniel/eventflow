"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { EventRow } from "@/lib/schemas";
import { usePanelSaver } from "@/components/events/usePanelSaver";

export function PanelFinances({ event }: { event: EventRow }) {
  const { save } = usePanelSaver(event.id, "finances");

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2 flex items-center justify-between rounded-lg border p-4">
        <div>
          <Label htmlFor="dana" className="text-sm font-medium">
            Dana-based
          </Label>
          <p className="text-xs text-muted-foreground">
            Suggested-donation pricing rather than a set fee.
          </p>
        </div>
        <Switch
          id="dana"
          checked={event.finances.dana}
          onCheckedChange={(v) => void save({ dana: v === true })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="registration_fee">Registration fee</Label>
        <Input
          id="registration_fee"
          defaultValue={event.finances.registration_fee ?? ""}
          onBlur={(e) =>
            save({ registration_fee: e.target.value.trim() || undefined })
          }
          placeholder="$25 / sliding scale / dana"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="expected_attendance">Expected attendance</Label>
        <Input
          id="expected_attendance"
          type="number"
          inputMode="numeric"
          min={0}
          defaultValue={event.finances.expected_attendance ?? ""}
          onBlur={(e) => {
            const raw = e.target.value;
            const n = raw === "" ? undefined : Number(raw);
            save({
              expected_attendance:
                typeof n === "number" && !Number.isNaN(n) ? n : undefined,
            });
          }}
        />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="budget_notes">Budget notes</Label>
        <Textarea
          id="budget_notes"
          rows={4}
          defaultValue={event.finances.budget_notes ?? ""}
          onBlur={(e) =>
            save({ budget_notes: e.target.value.trim() || undefined })
          }
          placeholder="Costs, sponsors, expected revenue, etc."
        />
      </div>
    </div>
  );
}
