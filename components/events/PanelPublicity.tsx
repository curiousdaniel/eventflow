"use client";

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
import { Separator } from "@/components/ui/separator";
import {
  CHANNEL_KEYS,
  CHANNEL_LABELS,
  CHANNEL_STATUS_LABELS,
  CHANNEL_STATUSES,
  type ChannelKey,
  type ChannelStatus,
  type EventRow,
} from "@/lib/schemas";
import { usePanelSaver } from "@/components/events/usePanelSaver";

export function PanelPublicity({ event }: { event: EventRow }) {
  return (
    <div className="space-y-6">
      {CHANNEL_KEYS.map((key, idx) => (
        <div key={key} className="space-y-3">
          {idx > 0 ? <Separator /> : null}
          <ChannelEditor event={event} channel={key} />
        </div>
      ))}
    </div>
  );
}

function ChannelEditor({
  event,
  channel,
}: {
  event: EventRow;
  channel: ChannelKey;
}) {
  const { save } = usePanelSaver(event.id, "publicity");
  const c = event.publicity[channel];

  function patch(p: Partial<EventRow["publicity"][ChannelKey]>) {
    void save({ [channel]: { ...c, ...p } });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{CHANNEL_LABELS[channel]}</h3>
        <Select
          value={c.status}
          onValueChange={(v) => patch({ status: v as ChannelStatus })}
        >
          <SelectTrigger className="h-8 w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CHANNEL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {CHANNEL_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${channel}-scheduled`}>Scheduled date</Label>
        <Input
          id={`${channel}-scheduled`}
          type="date"
          defaultValue={c.scheduled_date ?? ""}
          onBlur={(e) =>
            patch({ scheduled_date: e.target.value || undefined })
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${channel}-url`}>URL</Label>
        <Input
          id={`${channel}-url`}
          type="url"
          defaultValue={c.url ?? ""}
          onBlur={(e) => patch({ url: e.target.value.trim() || undefined })}
          placeholder="https://…"
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${channel}-draft`}>Draft</Label>
        <Textarea
          id={`${channel}-draft`}
          rows={3}
          defaultValue={c.draft ?? ""}
          onBlur={(e) => patch({ draft: e.target.value || undefined })}
          placeholder={`${CHANNEL_LABELS[channel]} content draft…`}
        />
      </div>
    </div>
  );
}
