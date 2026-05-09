"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarItemChip } from "@/components/calendar/CalendarItemChip";
import { PromoItemDrawer } from "@/components/calendar/PromoItemDrawer";
import {
  CALENDAR_CHANNEL_KEYS,
  CALENDAR_CHANNEL_LABELS,
  CALENDAR_CHANNEL_CLASSES,
} from "@/lib/schemas";
import { cn } from "@/lib/utils";
import type { CalendarItem } from "@/lib/calendar/queries";

type ViewMode = "month" | "week";

interface CalendarViewProps {
  items: CalendarItem[];
  events: Array<{ id: string; title: string; start_date: string | null }>;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfWeek(d: Date): Date {
  const out = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  out.setUTCDate(out.getUTCDate() - out.getUTCDay());
  return out;
}
function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}
function addMonths(d: Date, months: number): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1),
  );
}
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function todayUTC(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function CalendarView({ items, events }: CalendarViewProps) {
  const today = useMemo(() => todayUTC(), []);
  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState<Date>(() => startOfMonth(todayUTC()));
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [activeItem, setActiveItem] = useState<CalendarItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filteredItems = useMemo(() => {
    if (eventFilter === "all") return items;
    return items.filter((i) => i.event_id === eventFilter);
  }, [items, eventFilter]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const i of filteredItems) {
      const list = map.get(i.target_date) ?? [];
      list.push(i);
      map.set(i.target_date, list);
    }
    return map;
  }, [filteredItems]);

  const days = useMemo(() => {
    if (view === "week") {
      const start = startOfWeek(cursor);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const monthStart = startOfMonth(cursor);
    const gridStart = startOfWeek(monthStart);
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [cursor, view]);

  const heading = useMemo(() => {
    if (view === "month") {
      return `${MONTH_NAMES[cursor.getUTCMonth()]} ${cursor.getUTCFullYear()}`;
    }
    const start = startOfWeek(cursor);
    const end = addDays(start, 6);
    return `${MONTH_NAMES[start.getUTCMonth()]} ${start.getUTCDate()} – ${MONTH_NAMES[end.getUTCMonth()]} ${end.getUTCDate()}, ${end.getUTCFullYear()}`;
  }, [cursor, view]);

  function navigate(delta: number) {
    setCursor((c) =>
      view === "week" ? addDays(c, 7 * delta) : addMonths(c, delta),
    );
  }
  function goToday() {
    setCursor(view === "week" ? startOfWeek(todayUTC()) : startOfMonth(todayUTC()));
  }
  function openItem(it: CalendarItem) {
    setActiveItem(it);
    setDrawerOpen(true);
  }

  const todayIso = isoDate(today);
  const cursorMonth = cursor.getUTCMonth();

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <header className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label="Previous"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={goToday}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => navigate(1)}
            aria-label="Next"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <h2 className="text-lg font-semibold">{heading}</h2>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All events</SelectItem>
              {events.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title}
                  {e.start_date ? ` · ${e.start_date}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="inline-flex overflow-hidden rounded-md border">
            <button
              type="button"
              className={cn(
                "px-3 py-1.5 text-sm",
                view === "month"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent",
              )}
              onClick={() => setView("month")}
            >
              Month
            </button>
            <button
              type="button"
              className={cn(
                "px-3 py-1.5 text-sm",
                view === "week"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent",
              )}
              onClick={() => setView("week")}
            >
              Week
            </button>
          </div>
        </div>
      </header>

      <div className="rounded-lg border bg-card">
        <div className="grid grid-cols-7 border-b text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {WEEKDAY_LABELS.map((w) => (
            <div key={w} className="px-2 py-2">
              {w}
            </div>
          ))}
        </div>
        <div
          className={cn(
            "grid grid-cols-7",
            view === "month"
              ? "grid-rows-6 [&>*]:min-h-[110px]"
              : "[&>*]:min-h-[260px]",
          )}
        >
          {days.map((d) => {
            const iso = isoDate(d);
            const inMonth = view === "week" || d.getUTCMonth() === cursorMonth;
            const isToday = iso === todayIso;
            const dayItems = itemsByDate.get(iso) ?? [];
            return (
              <div
                key={iso}
                className={cn(
                  "flex flex-col gap-1 border-b border-r p-1.5 text-xs last:border-r-0",
                  !inMonth && "bg-muted/40 text-muted-foreground",
                  isToday && "bg-primary/5",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex size-5 items-center justify-center rounded-full text-[11px]",
                      isToday &&
                        "bg-primary font-semibold text-primary-foreground",
                    )}
                  >
                    {d.getUTCDate()}
                  </span>
                  {dayItems.length > 0 ? (
                    <span className="text-[10px] text-muted-foreground">
                      {dayItems.length}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-col gap-0.5">
                  {dayItems.slice(0, view === "week" ? 12 : 4).map((it) => (
                    <CalendarItemChip
                      key={it.id}
                      item={it}
                      onClick={openItem}
                      compact={view === "month"}
                      showEventTitle={view === "week"}
                    />
                  ))}
                  {view === "month" && dayItems.length > 4 ? (
                    <button
                      type="button"
                      onClick={() => openItem(dayItems[4])}
                      className="rounded px-1 text-left text-[10px] text-muted-foreground hover:bg-accent"
                    >
                      +{dayItems.length - 4} more
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Channel legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="font-medium">Channels:</span>
        {CALENDAR_CHANNEL_KEYS.map((c) => (
          <span key={c} className="inline-flex items-center gap-1">
            <span
              className={cn(
                "size-2 rounded-full",
                CALENDAR_CHANNEL_CLASSES[c].dot,
              )}
              aria-hidden
            />
            {CALENDAR_CHANNEL_LABELS[c]}
          </span>
        ))}
      </div>

      <PromoItemDrawer
        item={activeItem}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onItemChanged={(it) => {
          if (it) setActiveItem(it);
        }}
      />
    </div>
  );
}
