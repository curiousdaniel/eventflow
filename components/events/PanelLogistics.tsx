"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EventRow } from "@/lib/schemas";
import { usePanelSaver } from "@/components/events/usePanelSaver";

export function PanelLogistics({ event }: { event: EventRow }) {
  const { save } = usePanelSaver(event.id, "logistics");
  const fields: Array<[keyof EventRow["logistics"], string, string]> = [
    ["venue_details", "Venue details", "Address, room, parking, etc."],
    ["av_needs", "AV needs", "Microphones, projector, recording, etc."],
    ["setup_teardown", "Setup / teardown", "Who, when, what's needed."],
    ["catering", "Catering", "Food and drink arrangements."],
    [
      "accessibility",
      "Accessibility",
      "Wheelchair access, hearing assistance, etc.",
    ],
    ["notes", "Notes", "Anything else."],
  ];

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {fields.map(([key, label, placeholder]) => (
        <div key={key} className="space-y-2 sm:col-span-2">
          <Label htmlFor={`logistics-${key}`}>{label}</Label>
          <Textarea
            id={`logistics-${key}`}
            rows={3}
            defaultValue={(event.logistics[key] as string | undefined) ?? ""}
            onBlur={(e) =>
              save({ [key]: e.target.value.trim() || undefined })
            }
            placeholder={placeholder}
          />
        </div>
      ))}
    </div>
  );
}
