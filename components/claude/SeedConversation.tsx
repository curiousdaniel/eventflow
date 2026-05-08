"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, SendHorizonal, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  EventTypeEnum,
  parseLatestEventData,
  stripEventDataBlocks,
  TYPE_LABELS,
  type EventType,
  type SeedEventData,
} from "@/lib/schemas";
import { createEvent } from "@/lib/events/actions";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const STARTER_PROMPT =
  "Hi! I'm here to help you create a new event for LRDC. Tell me what you have so far — even something rough like \"Geshe Tsewang is planning to visit in October\" is plenty to start with.";

export function SeedConversation() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: STARTER_PROMPT },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [creating, setCreating] = useState(false);
  const [preview, setPreview] = useState<SeedEventData | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;

    const newUser: ChatMessage = { role: "user", content: text };
    const placeholder: ChatMessage = {
      role: "assistant",
      content: "",
      streaming: true,
    };

    setMessages((m) => [...m, newUser, placeholder]);
    setInput("");
    setStreaming(true);

    const apiMessages = [...messages, newUser]
      .filter((m) => m.content.trim().length > 0 || m.role === "user")
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/claude/seed-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok || !res.body) {
        const err = await res.text().catch(() => "");
        throw new Error(err || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const latest = parseLatestEventData(buffer);
        if (latest) setPreview(latest);

        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = {
            role: "assistant",
            content: buffer,
            streaming: true,
          };
          return copy;
        });
      }

      const finalLatest = parseLatestEventData(buffer);
      if (finalLatest) setPreview(finalLatest);

      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: "assistant",
          content: buffer,
          streaming: false,
        };
        return copy;
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Claude request failed",
      );
      setMessages((m) => {
        const copy = [...m];
        copy.pop();
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  async function handleCreate() {
    if (!preview) return;
    const title = (preview.title ?? "").trim();
    if (!title) {
      toast.error("Claude hasn't suggested a title yet.");
      return;
    }

    const eventTypeParsed = EventTypeEnum.safeParse(preview.event_type);
    const eventType: EventType | null = eventTypeParsed.success
      ? eventTypeParsed.data
      : null;

    setCreating(true);
    try {
      const id = await createEvent({
        title,
        event_type: eventType,
        start_date: preview.start_date ?? null,
        end_date: preview.end_date ?? null,
        core: {
          teacher: preview.core?.teacher,
          location: preview.core?.location,
          description: preview.core?.description,
          notes: preview.core?.notes,
        },
      });
      toast.success("Event created.");
      router.push(`/events/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
      setCreating(false);
    }
  }

  const canCreate = !!preview?.title?.trim() && !creating && !streaming;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),360px]">
      <Card className="flex h-[calc(100svh-180px)] flex-col">
        <CardHeader className="shrink-0">
          <CardTitle className="text-lg">New event — seed intake</CardTitle>
          <CardDescription>
            Tell Claude what you know about the event. It will ask a few
            follow-ups and build a starting record.
          </CardDescription>
        </CardHeader>

        <div ref={transcriptRef} className="flex-1 space-y-3 overflow-y-auto px-6 pb-3">
          {messages.map((m, i) => {
            const display =
              m.role === "assistant"
                ? stripEventDataBlocks(m.content) ||
                  (m.streaming ? "" : "")
                : m.content;
            return (
              <div
                key={i}
                className={cn(
                  "flex",
                  m.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted",
                  )}
                >
                  {display ||
                    (m.streaming ? (
                      <span className="inline-flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="size-3 animate-spin" />
                        Thinking…
                      </span>
                    ) : (
                      ""
                    ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="shrink-0 border-t p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="flex items-end gap-2"
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…"
              className="min-h-[44px] resize-none"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              disabled={streaming}
            />
            <Button
              type="submit"
              size="icon"
              disabled={streaming || input.trim().length === 0}
              aria-label="Send"
            >
              {streaming ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <SendHorizonal className="size-4" />
              )}
            </Button>
          </form>
        </div>
      </Card>

      <Card className="flex h-[calc(100svh-180px)] flex-col">
        <CardHeader className="shrink-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-muted-foreground" />
            Live preview
          </CardTitle>
          <CardDescription>
            Updates as Claude extracts structured data from the conversation.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto">
          {!preview ? (
            <p className="text-sm text-muted-foreground">
              No preview yet. Once Claude has enough to start a record, the
              extracted fields will appear here.
            </p>
          ) : (
            <PreviewFields preview={preview} />
          )}
        </CardContent>

        <div className="shrink-0 border-t p-4">
          <Button
            type="button"
            className="w-full"
            disabled={!canCreate}
            onClick={() => void handleCreate()}
          >
            {creating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Create event"
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function PreviewFields({ preview }: { preview: SeedEventData }) {
  const eventTypeParsed = EventTypeEnum.safeParse(preview.event_type);
  const typeLabel = eventTypeParsed.success
    ? TYPE_LABELS[eventTypeParsed.data]
    : preview.event_type ?? null;

  const fields: Array<[string, string | null | undefined]> = [
    ["Title", preview.title],
    ["Event type", typeLabel ?? null],
    ["Start date", preview.start_date ?? null],
    ["End date", preview.end_date ?? null],
    ["Teacher", preview.core?.teacher ?? null],
    ["Location", preview.core?.location ?? null],
    ["Description", preview.core?.description ?? null],
    ["Notes", preview.core?.notes ?? null],
  ];

  return (
    <dl className="space-y-3 text-sm">
      {fields.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
          <dd className="mt-0.5 whitespace-pre-wrap">
            {value ? value : <span className="text-muted-foreground">—</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
