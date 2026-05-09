import type { EventRow, EventStage, PanelKey } from "@/lib/schemas";
import { PANEL_KEYS } from "@/lib/schemas";

/**
 * A required-field rule is identified by:
 *   - which panel it belongs to (used to compute per-panel completeness),
 *   - a label (for "missing requirements" UI),
 *   - a predicate that returns true when the field is filled on this event.
 *
 * The "panel" key "_top" represents top-level event columns (title,
 * event_type, start_date) — they're shown under the Core panel for UI
 * purposes since that's where the user edits them.
 */
export interface RequirementRule {
  id: string;
  panel: PanelKey;
  label: string;
  isFilled: (event: EventRow) => boolean;
}

const hasText = (v: string | null | undefined): boolean =>
  typeof v === "string" && v.trim().length > 0;

const RULES: Record<string, RequirementRule> = {
  title: {
    id: "title",
    panel: "core",
    label: "Title",
    isFilled: (e) => hasText(e.title) && e.title !== "Untitled Event",
  },
  event_type: {
    id: "event_type",
    panel: "core",
    label: "Event type",
    isFilled: (e) => e.event_type !== null && e.event_type !== undefined,
  },
  start_date: {
    id: "start_date",
    panel: "core",
    label: "Start date",
    isFilled: (e) => hasText(e.start_date),
  },
  core_teacher_or_description: {
    id: "core_teacher_or_description",
    panel: "core",
    label: "Teacher or description",
    isFilled: (e) =>
      hasText(e.core.teacher) || hasText(e.core.description),
  },
  core_location: {
    id: "core_location",
    panel: "core",
    label: "Location",
    isFilled: (e) => hasText(e.core.location),
  },
  rinpoche_approved: {
    id: "rinpoche_approved",
    panel: "approvals",
    label: "Rinpoche approval",
    isFilled: (e) => e.approvals.rinpoche_approved === true,
  },
  publicity_started: {
    id: "publicity_started",
    panel: "publicity",
    label: "At least one publicity channel started",
    isFilled: (e) =>
      Object.values(e.publicity).some((c) => c.status !== "not_started"),
  },
  publicity_published: {
    id: "publicity_published",
    panel: "publicity",
    label: "At least one publicity channel published",
    isFilled: (e) =>
      Object.values(e.publicity).some((c) => c.status === "published"),
  },
};

/**
 * Required field IDs by stage (per the brief's table). To advance INTO a
 * given stage, every requirement listed under that stage must be satisfied.
 */
const REQUIREMENTS_BY_STAGE: Record<EventStage, string[]> = {
  seed: ["title"],
  planning: ["title", "event_type", "core_teacher_or_description"],
  confirmed: [
    "title",
    "event_type",
    "start_date",
    "core_location",
    "rinpoche_approved",
  ],
  in_promotion: [
    "title",
    "event_type",
    "start_date",
    "core_location",
    "rinpoche_approved",
    "publicity_started",
  ],
  active: [
    "title",
    "event_type",
    "start_date",
    "core_location",
    "rinpoche_approved",
    "publicity_published",
  ],
  // No additional requirements — manual close-out.
  complete: [
    "title",
    "event_type",
    "start_date",
    "core_location",
    "rinpoche_approved",
    "publicity_published",
  ],
};

/**
 * Resolve the requirement rules for the event's *current* stage. UI uses
 * these to color completeness, and to highlight what's still missing.
 */
export function getRequirementsForStage(
  stage: EventStage,
): RequirementRule[] {
  return (REQUIREMENTS_BY_STAGE[stage] ?? []).map((id) => RULES[id]);
}

/**
 * Same, but for the *next* stage — used by the stage-advance guard rail.
 */
export function getRequirementsForNextStage(
  current: EventStage,
): { stage: EventStage; rules: RequirementRule[] } | null {
  const order: EventStage[] = [
    "seed",
    "planning",
    "confirmed",
    "in_promotion",
    "active",
    "complete",
  ];
  const idx = order.indexOf(current);
  if (idx < 0 || idx >= order.length - 1) return null;
  const nextStage = order[idx + 1];
  return {
    stage: nextStage,
    rules: getRequirementsForStage(nextStage),
  };
}

export interface PanelCompleteness {
  filled: number;
  total: number;
  fraction: number;
}

export interface EventCompleteness {
  overall: number;
  panels: Record<PanelKey, PanelCompleteness>;
  missing: RequirementRule[];
}

/**
 * Compute completeness against the event's *current* stage requirements.
 *
 * Per the brief: "Completeness score per panel = (filled required fields
 * for current stage) / (total required fields for current stage that
 * belong to this panel)."
 *
 * Panels that have no required fields at this stage report 1.0 (they're
 * trivially complete). The overall score is the unweighted average of all
 * required-rule satisfactions.
 */
export function getEventCompleteness(event: EventRow): EventCompleteness {
  const rules = getRequirementsForStage(event.stage);

  const panels = Object.fromEntries(
    PANEL_KEYS.map((p) => [p, { filled: 0, total: 0, fraction: 1 }]),
  ) as Record<PanelKey, PanelCompleteness>;

  let totalFilled = 0;

  for (const rule of rules) {
    panels[rule.panel].total += 1;
    if (rule.isFilled(event)) {
      panels[rule.panel].filled += 1;
      totalFilled += 1;
    }
  }

  for (const p of PANEL_KEYS) {
    const { filled, total } = panels[p];
    panels[p].fraction = total === 0 ? 1 : filled / total;
  }

  const overall = rules.length === 0 ? 1 : totalFilled / rules.length;
  const missing = rules.filter((r) => !r.isFilled(event));

  return { overall, panels, missing };
}

/**
 * For UI: missing rules that block advancing into the next stage. Returns
 * null if there's no next stage (already at "complete").
 */
export function getMissingForNextStage(event: EventRow): {
  stage: EventStage;
  missing: RequirementRule[];
} | null {
  const next = getRequirementsForNextStage(event.stage);
  if (!next) return null;
  const missing = next.rules.filter((r) => !r.isFilled(event));
  return { stage: next.stage, missing };
}

// -----------------------------------------------------------------------------
// Stage-aware alerts (Phase 3): things that should be in the user's face as
// they look at an event. Distinct from "completeness" because alerts are
// time-sensitive and behavioural ("event is in 5 days but no publicity is
// published") rather than stage-gate rules.
// -----------------------------------------------------------------------------
export type AlertSeverity = "info" | "warning" | "danger";

export interface EventAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description?: string;
}

function daysFromToday(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const target = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const ms = target.getTime() - today;
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/**
 * Generate a stage-aware list of alerts for an event. The UI renders these
 * at the top of the event workspace.
 *
 * Rules (from the brief, plus a few obvious ones):
 *  - in_promotion + start_date within 7 days + no published channels → danger
 *  - in_promotion + start_date within 14 days + no started channels → warning
 *  - planning + no start_date → info
 *  - confirmed + no Rinpoche approval → warning
 *  - active + start_date in the past + no published channels → warning
 *  - any stage + start_date in the past + stage < complete → info nudge
 */
export function getEventAlerts(event: EventRow): EventAlert[] {
  const alerts: EventAlert[] = [];
  const days = daysFromToday(event.start_date);

  const publicityValues = Object.values(event.publicity);
  const anyStarted = publicityValues.some((c) => c.status !== "not_started");
  const anyPublished = publicityValues.some((c) => c.status === "published");

  if (event.stage === "in_promotion") {
    if (days !== null && days >= 0 && days <= 7 && !anyPublished) {
      alerts.push({
        id: "promo-7-no-published",
        severity: "danger",
        title: `Event is in ${days} day${days === 1 ? "" : "s"} and nothing is published`,
        description:
          "Get at least one publicity channel published immediately — newsletter and Eventbrite are usually highest leverage.",
      });
    } else if (days !== null && days >= 0 && days <= 14 && !anyStarted) {
      alerts.push({
        id: "promo-14-no-started",
        severity: "warning",
        title: `Event is in ${days} day${days === 1 ? "" : "s"} and no publicity has started`,
        description:
          "Begin drafting publicity content for at least one channel.",
      });
    }
  }

  if (event.stage === "planning" && !event.start_date) {
    alerts.push({
      id: "planning-no-date",
      severity: "info",
      title: "No start date set",
      description:
        "Lock in at least a tentative date so promotional planning can begin.",
    });
  }

  if (event.stage === "confirmed" && !event.approvals.rinpoche_approved) {
    alerts.push({
      id: "confirmed-no-approval",
      severity: "warning",
      title: "Confirmed without Rinpoche approval",
      description:
        "Get explicit Rinpoche approval recorded before promotion begins.",
    });
  }

  if (
    event.stage === "active" &&
    days !== null &&
    days < 0 &&
    !anyPublished
  ) {
    alerts.push({
      id: "active-past-no-published",
      severity: "warning",
      title: "Event has started or passed but nothing was published",
      description:
        "Verify the event happened as planned and update its publicity records.",
    });
  }

  if (
    event.stage !== "complete" &&
    days !== null &&
    days < -1 &&
    event.stage !== "active"
  ) {
    alerts.push({
      id: "past-not-complete",
      severity: "info",
      title: `Event date is ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} in the past`,
      description: "Consider closing this event out by advancing it to Complete.",
    });
  }

  return alerts;
}
