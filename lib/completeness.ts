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
