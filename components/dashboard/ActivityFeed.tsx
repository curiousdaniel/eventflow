import Link from "next/link";
import { Activity } from "lucide-react";
import { formatRelative } from "@/lib/format";
import type { ActivityEntry } from "@/lib/dashboard/queries";

export function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  return (
    <section className="rounded-lg border bg-card">
      <header className="flex items-center gap-2 border-b px-5 py-3">
        <Activity className="size-4 text-muted-foreground" aria-hidden />
        <h2 className="text-base font-semibold">Recent activity</h2>
      </header>

      {entries.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          No activity yet. Edits to events will show up here.
        </p>
      ) : (
        <ul className="divide-y">
          {entries.map((e) => (
            <li key={e.id} className="px-5 py-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  href={`/events/${e.event_id}`}
                  className="truncate font-medium underline-offset-2 hover:underline"
                >
                  {e.event_title}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {formatRelative(e.created_at)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {e.note ?? "Saved"}
                {e.changed_by_name ? (
                  <>
                    {" · "}
                    <span className="text-foreground">{e.changed_by_name}</span>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
