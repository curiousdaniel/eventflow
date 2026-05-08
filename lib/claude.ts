import Anthropic from "@anthropic-ai/sdk";
import type { EventRow } from "@/lib/schemas";
import type { EventCompleteness } from "@/lib/completeness";

/**
 * Anthropic model used throughout EventFlow. Per the project brief; isolate
 * the model name in this constant so swapping is a single-line change.
 */
export const MODEL_ID = "claude-sonnet-4-20250514";

/**
 * Default max output tokens for short responses (sidebar replies, stage notes).
 * Use LONG_FORM_MAX_TOKENS for newsletter / Eventbrite drafts.
 */
export const DEFAULT_MAX_TOKENS = 1024;
export const LONG_FORM_MAX_TOKENS = 2048;

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// -----------------------------------------------------------------------------
// Shared LRDC context — pasted into every system prompt.
// -----------------------------------------------------------------------------
export const LRDC_CONTEXT = `Lion's Roar Dharma Center (LRDC) is a small Vajrayana Buddhist dharma center in Sacramento, CA, led by Rinpoche Geshe Ngawang Dakpa. The center hosts regular weekly practices and special teachings, empowerments, retreats, community events, and fundraisers.

Key people:
- Rinpoche (Geshe Ngawang Dakpa) — spiritual director; his approval is required for certain event types.
- Patty — manages the email newsletter; primary admin coordinator.
- Dirk — manages the website.
- Daniel — manages social media (Facebook, Instagram, YouTube), SMS, Eventbrite, and Meetup.
- Jen — chairs the membership committee; admin.
- Ellen — handles finances; admin.`;

const CHANNEL_GUIDELINES = `Channel guidelines:
- Newsletter: warm, informative, 150-300 words.
- Social media: brief, engaging, include a call to action.
- SMS: under 160 characters, urgent and clear.
- Eventbrite: full description with all logistics, 200-400 words.
- Website: clear and informational.
- Meetup: friendly, community-oriented, includes practical details.`;

// -----------------------------------------------------------------------------
// Seed Intake — system prompt for /events/new
// -----------------------------------------------------------------------------
export const SEED_INTAKE_SYSTEM_PROMPT = `You are helping create a new event record for ${LRDC_CONTEXT.split("\n")[0]}

Your job is to gather enough information to create an initial event record through natural conversation. You are warm, efficient, and familiar with Buddhist event planning.

Extract as much as you can from what the user tells you. Ask targeted follow-up questions — no more than 2-3 at a time — to fill in: event title, event type (teaching/empowerment/retreat/community/fundraiser/other), rough dates, teacher or speaker name, and location.

When you have gathered enough for a useful starting record (at minimum: a title and some sense of what the event is), output a JSON block in this exact format wrapped in <event_data> tags:

<event_data>
{
  "title": "",
  "event_type": "",
  "start_date": null,
  "end_date": null,
  "core": {
    "teacher": "",
    "location": "",
    "description": "",
    "notes": ""
  }
}
</event_data>

Use ISO 8601 strings for dates (e.g. "2026-10-15") or null if you don't know. Only use these event_type values: teaching, empowerment, retreat, community, fundraiser, other.

Continue the conversation to refine the data. Re-emit the <event_data> block whenever the structured data changes. The user's app will parse the most recent <event_data> block to show a live preview.

Keep your conversational responses brief and warm. This is a planning tool, not a chat assistant.`;

// -----------------------------------------------------------------------------
// Event Sidebar — system prompt builder for /events/[id]
// -----------------------------------------------------------------------------
export function buildEventSystemPrompt(
  event: EventRow,
  completeness: EventCompleteness,
  today: string,
): string {
  const completenessSummary = {
    overall: completeness.overall,
    panels: Object.fromEntries(
      Object.entries(completeness.panels).map(([k, v]) => [
        k,
        { filled: v.filled, total: v.total, fraction: v.fraction },
      ]),
    ),
    missing: completeness.missing.map((r) => r.label),
  };

  return `You are the planning assistant for ${LRDC_CONTEXT.split("\n")[0]} You are embedded in the EventFlow planning tool.

Today's date is ${today}.

You are helping coordinate the following event:

## Event Record
${JSON.stringify(event, null, 2)}

## Completeness
${JSON.stringify(completenessSummary, null, 2)}

## About LRDC's Communication Channels
- Website: managed by Dirk
- Email newsletter: managed by Patty
- Social media (Facebook, Instagram, YouTube): managed by Daniel
- SMS text message list: managed by Daniel
- Eventbrite: managed by Daniel
- Meetup.com group: managed by Daniel

${LRDC_CONTEXT}

## Your Role
Answer questions about this event specifically. Help draft content for any channel. Identify what information is still missing. Suggest next steps based on the current stage and completeness. Generate promotional copy when asked. Be concise and practical.

When drafting content, tailor it to the channel:
${CHANNEL_GUIDELINES}

Do not hallucinate event details. If a field is empty or null, say so rather than inventing content.`;
}

// -----------------------------------------------------------------------------
// Stage Transition Note — one-shot prompt for "what to do next"
// -----------------------------------------------------------------------------
export function buildStageTransitionPrompt(
  event: EventRow,
  previousStage: string,
  newStage: string,
  today: string,
): string {
  return `Event: ${event.title}
Just advanced from stage: ${previousStage} → ${newStage}
Current record:
${JSON.stringify(event, null, 2)}
Today: ${today}

Write a brief (3-5 bullet points) action-oriented note: what are the most important next steps now that this event is at the ${newStage} stage? Be specific to this event's details. Focus on what's incomplete and time-sensitive.`;
}

// -----------------------------------------------------------------------------
// Promotional Item Draft — one-shot prompt for the calendar drawer (Phase 4
// uses this; defining now keeps prompt logic centralised).
// -----------------------------------------------------------------------------
export function buildPromoDraftPrompt(args: {
  event: EventRow;
  today: string;
  daysUntil: number;
  channel: string;
  actionType: string;
  targetDate: string;
}): string {
  const { event, today, daysUntil, channel, actionType, targetDate } = args;
  return `Event:
${JSON.stringify(event, null, 2)}

Today: ${today}
Days until event: ${daysUntil}

Draft ${channel} content for this event.
Action type: ${actionType}
Scheduled for: ${targetDate}

${CHANNEL_GUIDELINES}

Output only the draft content, no commentary.`;
}
