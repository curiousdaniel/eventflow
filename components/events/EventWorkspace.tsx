"use client";

import { useMemo } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { CompletenessBar } from "@/components/events/CompletenessBar";
import { EditableTitle } from "@/components/events/EditableTitle";
import { EventAlertsBanner } from "@/components/events/EventAlertsBanner";
import { EventSidebar } from "@/components/claude/EventSidebar";
import { GenerateScheduleButton } from "@/components/events/GenerateScheduleButton";
import { HistoryTimeline } from "@/components/events/HistoryTimeline";
import { PanelApprovals } from "@/components/events/PanelApprovals";
import { PanelCore } from "@/components/events/PanelCore";
import { PanelFinances } from "@/components/events/PanelFinances";
import { PanelLogistics } from "@/components/events/PanelLogistics";
import { PanelPublicity } from "@/components/events/PanelPublicity";
import { PanelVolunteers } from "@/components/events/PanelVolunteers";
import { StageAdvanceButton } from "@/components/events/StageAdvanceButton";
import { StageBadge } from "@/components/events/StageBadge";
import { getEventAlerts, getEventCompleteness } from "@/lib/completeness";
import { formatRelative } from "@/lib/format";
import { PANEL_KEYS, PANEL_LABELS, type EventRow } from "@/lib/schemas";
import type { EventHistoryEntry, EventMessage } from "@/lib/events/queries";

const PANEL_COMPONENTS = {
  core: PanelCore,
  logistics: PanelLogistics,
  approvals: PanelApprovals,
  publicity: PanelPublicity,
  volunteers: PanelVolunteers,
  finances: PanelFinances,
} as const;

interface EventWorkspaceProps {
  event: EventRow;
  initialMessages: EventMessage[];
  history: EventHistoryEntry[];
}

export function EventWorkspace({
  event,
  initialMessages,
  history,
}: EventWorkspaceProps) {
  const completeness = useMemo(
    () => getEventCompleteness(event),
    [event],
  );

  const alerts = useMemo(() => getEventAlerts(event), [event]);

  const canGenerateSchedule =
    !!event.start_date &&
    (event.stage === "confirmed" ||
      event.stage === "in_promotion" ||
      event.stage === "active");

  const lastEdit = history[0];
  const lastEditedBy = lastEdit?.changed_by_name?.trim() || null;
  const lastEditedAt = lastEdit?.created_at ?? event.updated_at;

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr),320px]">
      <div className="flex min-w-0 flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <EditableTitle eventId={event.id} initialTitle={event.title} />
            <StageBadge stage={event.stage} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canGenerateSchedule ? (
              <GenerateScheduleButton event={event} />
            ) : null}
            <StageAdvanceButton event={event} />
          </div>
        </header>

        <p className="text-xs text-muted-foreground">
          Last edited {formatRelative(lastEditedAt)}
          {lastEditedBy ? (
            <>
              {" by "}
              <span className="text-foreground">{lastEditedBy}</span>
            </>
          ) : null}
        </p>

        <EventAlertsBanner alerts={alerts} />

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Completeness for stage {event.stage}</span>
            <span>{Math.round(completeness.overall * 100)}%</span>
          </div>
          <CompletenessBar fraction={completeness.overall} />
        </div>

        <Tabs defaultValue="core" className="flex flex-col gap-4">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
            {PANEL_KEYS.map((key) => {
              const p = completeness.panels[key];
              return (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="flex flex-col items-start gap-0.5 rounded-md border bg-card px-3 py-2 text-left data-[state=active]:bg-accent"
                >
                  <span className="text-sm font-medium">
                    {PANEL_LABELS[key]}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {p.total === 0
                      ? "—"
                      : `${p.filled} / ${p.total} required`}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {PANEL_KEYS.map((key) => {
            const Component = PANEL_COMPONENTS[key];
            return (
              <TabsContent
                key={key}
                value={key}
                className="rounded-lg border bg-card p-5"
              >
                <Component event={event} />
              </TabsContent>
            );
          })}
        </Tabs>

        <HistoryTimeline history={history} />
      </div>

      <div className="hidden h-[calc(100svh-130px)] lg:block">
        <EventSidebar
          eventId={event.id}
          initialMessages={initialMessages}
        />
      </div>
    </div>
  );
}
