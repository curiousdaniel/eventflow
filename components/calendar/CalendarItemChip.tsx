"use client";

import { Check, FileText, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getActionTypeLabel,
  getCalendarChannelMeta,
  type PromoStatus,
} from "@/lib/schemas";
import type { CalendarItem } from "@/lib/calendar/queries";

const STATUS_ICON: Record<PromoStatus, React.ComponentType<{ className?: string }>> = {
  pending: FileText,
  drafted: Check,
  sent: Send,
};

interface CalendarItemChipProps {
  item: CalendarItem;
  onClick: (item: CalendarItem) => void;
  showEventTitle?: boolean;
  compact?: boolean;
}

export function CalendarItemChip({
  item,
  onClick,
  showEventTitle = true,
  compact = false,
}: CalendarItemChipProps) {
  const meta = getCalendarChannelMeta(item.channel);
  const Icon = STATUS_ICON[item.status];

  return (
    <button
      type="button"
      onClick={() => onClick(item)}
      className={cn(
        "group flex w-full items-center gap-1.5 rounded border px-1.5 py-0.5 text-left text-[11px] leading-tight transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
        meta.classes.chip,
      )}
      title={`${item.event_title} — ${meta.label}: ${getActionTypeLabel(item.action_type)} (${item.status})`}
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          meta.classes.dot,
        )}
        aria-hidden
      />
      {compact ? (
        <span className="truncate font-medium">{meta.label}</span>
      ) : (
        <span className="flex min-w-0 flex-1 items-center gap-1">
          <span className="truncate font-medium">{meta.label}</span>
          <span className="truncate opacity-70">
            {getActionTypeLabel(item.action_type)}
          </span>
          {showEventTitle ? (
            <span className="ml-auto truncate text-[10px] opacity-80">
              {item.event_title}
            </span>
          ) : null}
        </span>
      )}
      {item.status !== "pending" ? (
        <Icon className="ml-auto size-3 shrink-0 opacity-70" aria-hidden />
      ) : null}
    </button>
  );
}
