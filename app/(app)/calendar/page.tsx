import { CalendarView } from "@/components/calendar/CalendarView";
import {
  listEventsForCalendarFilter,
  listPromoItems,
} from "@/lib/calendar/queries";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const [items, events] = await Promise.all([
    listPromoItems(),
    listEventsForCalendarFilter(),
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Promotional calendar
          </h1>
          <p className="text-sm text-muted-foreground">
            Every scheduled promotional touchpoint across all events.
          </p>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <h2 className="text-base font-medium">No promotional items yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Open an event with a confirmed start date and click{" "}
            <span className="font-medium text-foreground">
              Generate schedule
            </span>{" "}
            to populate the calendar.
          </p>
        </div>
      ) : (
        <CalendarView items={items} events={events} />
      )}
    </div>
  );
}
