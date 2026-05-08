"use client";

import { useMemo, useState } from "react";
import { EventCard } from "@/components/events/EventCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EVENT_STAGES,
  EVENT_TYPES,
  STAGE_LABELS,
  TYPE_LABELS,
  type EventRow,
  type EventStage,
  type EventType,
} from "@/lib/schemas";

const ANY = "any";
type StageFilter = EventStage | typeof ANY;
type TypeFilter = EventType | typeof ANY;

export function DashboardFilters({ events }: { events: EventRow[] }) {
  const [stage, setStage] = useState<StageFilter>(ANY);
  const [type, setType] = useState<TypeFilter>(ANY);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (stage !== ANY && e.stage !== stage) return false;
      if (type !== ANY && e.event_type !== type) return false;
      return true;
    });
  }, [events, stage, type]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Stage
          </span>
          <Select
            value={stage}
            onValueChange={(v) => setStage(v as StageFilter)}
          >
            <SelectTrigger className="h-8 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All stages</SelectItem>
              {EVENT_STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STAGE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Type
          </span>
          <Select
            value={type}
            onValueChange={(v) => setType(v as TypeFilter)}
          >
            <SelectTrigger className="h-8 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All types</SelectItem>
              {EVENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} of {events.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          No events match these filters.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}
