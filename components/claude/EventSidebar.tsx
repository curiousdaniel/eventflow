"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MessagesSquare, SendHorizonal, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { EventMessage } from "@/lib/events/queries";

interface PendingMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

export function EventSidebar({
  eventId,
  initialMessages,
}: {
  eventId: string;
  initialMessages: EventMessage[];
}) {
  const [messages, setMessages] = useState<PendingMessage[]>(() =>
    initialMessages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
    })),
  );
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: PendingMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    const assistantPlaceholder: PendingMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      streaming: true,
    };

    setMessages((m) => [...m, userMsg, assistantPlaceholder]);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch(`/api/events/${eventId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok || !res.body) {
        const err = await res.text().catch(() => "");
        throw new Error(err || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });

        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            ...copy[copy.length - 1],
            content: acc,
            streaming: true,
          };
          return copy;
        });
      }

      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          ...copy[copy.length - 1],
          content: acc,
          streaming: false,
        };
        return copy;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Claude request failed");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  }

  return (
    <aside className="flex h-full min-h-0 flex-col border-l bg-background">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <Sparkles className="size-4 text-muted-foreground" aria-hidden />
        <span className="text-sm font-medium">Claude</span>
      </div>

      <div
        ref={transcriptRef}
        className="flex-1 space-y-3 overflow-y-auto p-3"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <MessagesSquare className="size-8 opacity-40" aria-hidden />
            <p>Ask Claude about this event.</p>
            <p className="text-xs">
              Try: &quot;Draft a newsletter announcement&quot; or &quot;What&apos;s
              missing?&quot;
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex",
                m.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[90%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted",
                )}
              >
                {m.content ||
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
          ))
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="shrink-0 border-t p-3"
      >
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Claude…"
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
        </div>
      </form>
    </aside>
  );
}
