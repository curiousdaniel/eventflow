"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Clock } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { EventHistoryEntry } from "@/lib/events/queries";

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function HistoryTimeline({
  history,
}: {
  history: EventHistoryEntry[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm hover:bg-accent/50"
        >
          <span className="flex items-center gap-2 font-medium">
            <Clock className="size-4 text-muted-foreground" aria-hidden />
            History
            <span className="text-xs font-normal text-muted-foreground">
              ({history.length} {history.length === 1 ? "entry" : "entries"})
            </span>
          </span>
          {open ? (
            <ChevronDown className="size-4" aria-hidden />
          ) : (
            <ChevronRight className="size-4" aria-hidden />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="divide-y border-t">
          {history.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              No history entries yet.
            </p>
          ) : (
            history.map((h) => <HistoryRow key={h.id} entry={h} />)
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function HistoryRow({ entry }: { entry: EventHistoryEntry }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="px-4 py-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <div className="font-medium">{entry.note ?? "Saved"}</div>
          <div className="text-xs text-muted-foreground">
            {formatTimestamp(entry.created_at)}
            {entry.changed_by_name ? ` · ${entry.changed_by_name}` : ""}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            "shrink-0 text-xs font-medium text-muted-foreground hover:text-foreground",
          )}
        >
          {expanded ? "Hide snapshot" : "View snapshot"}
        </button>
      </div>
      {expanded ? (
        <pre className="mt-2 max-h-80 overflow-auto rounded bg-muted/50 p-3 text-xs">
          {JSON.stringify(entry.snapshot, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
