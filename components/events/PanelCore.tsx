"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EVENT_TYPES,
  TYPE_LABELS,
  type EventRow,
  type EventType,
} from "@/lib/schemas";
import { updateEventTopLevel } from "@/lib/events/actions";
import { usePanelSaver } from "@/components/events/usePanelSaver";

const NONE = "__none__";

function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export function PanelCore({ event }: { event: EventRow }) {
  const router = useRouter();
  const { save } = usePanelSaver(event.id, "core");

  const [savingTop, setSavingTop] = useState<string | null>(null);
  async function saveTop(patch: Parameters<typeof updateEventTopLevel>[1]) {
    setSavingTop(Object.keys(patch).join(", "));
    try {
      await updateEventTopLevel(event.id, patch);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingTop(null);
    }
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="core-description">Description</Label>
        <Textarea
          id="core-description"
          rows={3}
          defaultValue={event.core.description ?? ""}
          onBlur={(e) =>
            save({ description: e.target.value.trim() || undefined })
          }
          placeholder="A short description of the event."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="event_type">Event type</Label>
        <Select
          value={event.event_type ?? NONE}
          onValueChange={(v) =>
            void saveTop({
              event_type: v === NONE ? null : (v as EventType),
            })
          }
        >
          <SelectTrigger id="event_type">
            <SelectValue placeholder="Choose a type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>—</SelectItem>
            {EVENT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="teacher">Teacher / speaker</Label>
        <Input
          id="teacher"
          defaultValue={event.core.teacher ?? ""}
          onBlur={(e) => save({ teacher: e.target.value.trim() || undefined })}
          placeholder="e.g. Geshe Tsewang"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="start_date">Start date</Label>
        <Input
          id="start_date"
          type="date"
          defaultValue={isoToDateInput(event.start_date)}
          onChange={(e) => {
            const v = e.target.value;
            void saveTop({ start_date: v ? new Date(v).toISOString() : null });
          }}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="end_date">End date</Label>
        <Input
          id="end_date"
          type="date"
          defaultValue={isoToDateInput(event.end_date)}
          onChange={(e) => {
            const v = e.target.value;
            void saveTop({ end_date: v ? new Date(v).toISOString() : null });
          }}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          defaultValue={event.core.location ?? ""}
          onBlur={(e) =>
            save({ location: e.target.value.trim() || undefined })
          }
          placeholder="LRDC, virtual, or address"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="capacity">Capacity</Label>
        <Input
          id="capacity"
          type="number"
          inputMode="numeric"
          min={0}
          defaultValue={event.core.capacity ?? ""}
          onBlur={(e) => {
            const raw = e.target.value;
            const n = raw === "" ? undefined : Number(raw);
            save({
              capacity:
                typeof n === "number" && !Number.isNaN(n) ? n : undefined,
            });
          }}
        />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="registration_url">Registration URL</Label>
        <Input
          id="registration_url"
          type="url"
          defaultValue={event.core.registration_url ?? ""}
          onBlur={(e) =>
            save({ registration_url: e.target.value.trim() || undefined })
          }
          placeholder="https://…"
        />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="core-notes">Notes</Label>
        <Textarea
          id="core-notes"
          rows={4}
          defaultValue={event.core.notes ?? ""}
          onBlur={(e) => save({ notes: e.target.value.trim() || undefined })}
        />
      </div>

      {savingTop ? (
        <p className="col-span-full text-xs text-muted-foreground">
          Saving {savingTop}…
        </p>
      ) : null}
    </div>
  );
}
