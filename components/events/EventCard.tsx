import Link from "next/link";
import { CompletenessBar } from "@/components/events/CompletenessBar";
import { StageBadge } from "@/components/events/StageBadge";
import { Card } from "@/components/ui/card";
import { getEventCompleteness } from "@/lib/completeness";
import { TYPE_LABELS, type EventRow } from "@/lib/schemas";

function formatDate(iso: string | null): string {
  if (!iso) return "Date TBD";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatRelative(iso: string): string {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    const min = Math.round(ms / 60_000);
    if (min < 1) return "just now";
    if (min < 60) return `${min}m ago`;
    const h = Math.round(min / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString();
  } catch {
    return "";
  }
}

export function EventCard({ event }: { event: EventRow }) {
  const c = getEventCompleteness(event);
  return (
    <Card className="group transition hover:border-foreground/20 hover:shadow-sm">
      <Link href={`/events/${event.id}`} className="block p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-base font-semibold leading-tight">
            {event.title}
          </h3>
          <StageBadge stage={event.stage} className="shrink-0" />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {event.event_type ? (
            <span>{TYPE_LABELS[event.event_type]}</span>
          ) : (
            <span className="italic">Type TBD</span>
          )}
          <span aria-hidden>·</span>
          <span>{formatDate(event.start_date)}</span>
        </div>

        <div className="mt-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Completeness</span>
            <span>{Math.round(c.overall * 100)}%</span>
          </div>
          <CompletenessBar fraction={c.overall} />
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Updated {formatRelative(event.updated_at)}
        </p>
      </Link>
    </Card>
  );
}
