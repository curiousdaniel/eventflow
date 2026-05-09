"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  PROMO_STATUSES,
  PROMO_STATUS_LABELS,
  getActionTypeLabel,
  getCalendarChannelMeta,
  type PromoStatus,
} from "@/lib/schemas";
import { cn } from "@/lib/utils";
import type { CalendarItem } from "@/lib/calendar/queries";

interface PromoItemDrawerProps {
  item: CalendarItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemChanged?: (item: CalendarItem | null) => void;
}

export function PromoItemDrawer({
  item,
  open,
  onOpenChange,
  onItemChanged,
}: PromoItemDrawerProps) {
  const router = useRouter();

  const [content, setContent] = useState(item?.content ?? "");
  const [status, setStatus] = useState<PromoStatus>(
    (item?.status ?? "pending") as PromoStatus,
  );
  const [targetDate, setTargetDate] = useState(item?.target_date ?? "");
  const [saving, setSaving] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const draftAbortRef = useRef<AbortController | null>(null);

  // Re-sync local state when the drawer is opened with a different item.
  useEffect(() => {
    if (item) {
      setContent(item.content ?? "");
      setStatus(item.status as PromoStatus);
      setTargetDate(item.target_date);
    }
  }, [item?.id, item?.content, item?.status, item?.target_date, item]);

  // Cancel any in-flight draft stream when the drawer closes.
  useEffect(() => {
    if (!open && draftAbortRef.current) {
      draftAbortRef.current.abort();
      draftAbortRef.current = null;
    }
  }, [open]);

  if (!item) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full max-w-lg flex-col gap-4 sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>No item selected</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  const meta = getCalendarChannelMeta(item.channel);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/promotional-items/${item!.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status,
          content,
          target_date: targetDate,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        item?: CalendarItem;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      toast.success("Saved");
      onItemChanged?.(json.item ?? null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this promotional item? This cannot be undone.")) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/promotional-items/${item!.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      toast.success("Item deleted");
      onItemChanged?.(null);
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  async function handleDraft() {
    if (drafting) return;

    const ctrl = new AbortController();
    draftAbortRef.current = ctrl;
    setDrafting(true);
    setContent("");

    try {
      const res = await fetch(
        `/api/promotional-items/${item!.id}/draft`,
        { method: "POST", signal: ctrl.signal },
      );
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        setContent(buf);
      }
      setStatus((s) => (s === "sent" ? s : "drafted"));
      toast.success("Draft generated");
      router.refresh();
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      toast.error(err instanceof Error ? err.message : "Draft failed");
    } finally {
      setDrafting(false);
      draftAbortRef.current = null;
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full max-w-lg flex-col gap-4 overflow-y-auto sm:max-w-lg">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-2">
            <span
              className={cn("size-2.5 rounded-full", meta.classes.dot)}
              aria-hidden
            />
            <SheetTitle className="flex flex-wrap items-baseline gap-2">
              <span>{meta.label}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {getActionTypeLabel(item.action_type)}
              </span>
            </SheetTitle>
          </div>
          <SheetDescription>
            <Link
              href={`/events/${item.event_id}`}
              className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
            >
              {item.event_title}
              <ArrowUpRight className="size-3" aria-hidden />
            </Link>
            {item.event_start_date ? (
              <>
                {" · event on "}
                <span className="text-foreground">{item.event_start_date}</span>
              </>
            ) : null}
          </SheetDescription>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="promo-target-date">Scheduled for</Label>
            <Input
              id="promo-target-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="promo-status">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as PromoStatus)}
            >
              <SelectTrigger id="promo-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROMO_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PROMO_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="promo-content">Content</Label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="gap-1 text-xs"
              onClick={() => void handleDraft()}
              disabled={drafting}
            >
              {drafting ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Sparkles className="size-3" />
              )}
              {drafting ? "Drafting…" : "Ask Claude to draft"}
            </Button>
          </div>
          <Textarea
            id="promo-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            placeholder="Draft your content here, or click 'Ask Claude to draft' above."
          />
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || drafting}
          >
            {saving ? (
              <>
                <Loader2 className="mr-1 size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Close
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="ml-auto gap-1 text-destructive hover:text-destructive"
            onClick={() => void handleDelete()}
            disabled={deleting || saving || drafting}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
