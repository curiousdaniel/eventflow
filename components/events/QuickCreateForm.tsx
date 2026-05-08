"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EVENT_TYPES, TYPE_LABELS, type EventType } from "@/lib/schemas";
import { createEvent } from "@/lib/events/actions";

const NONE = "__none__";

export function QuickCreateForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<EventType | typeof NONE>(NONE);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const id = await createEvent({
        title: title.trim(),
        event_type: eventType === NONE ? null : eventType,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        end_date: endDate ? new Date(endDate).toISOString() : null,
        core: notes.trim() ? { notes: notes.trim() } : {},
      });
      toast.success("Event created.");
      router.push(`/events/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
      setSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle className="text-lg">New event — quick form</CardTitle>
          <CardDescription>
            Skip the conversation and seed an event with a few fields. You can
            fill the rest in on the workspace.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Visit by Geshe Tsewang"
              disabled={submitting}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="event_type">Event type</Label>
              <Select
                value={eventType}
                onValueChange={(v) => setEventType(v as EventType | typeof NONE)}
                disabled={submitting}
              >
                <SelectTrigger id="event_type">
                  <SelectValue placeholder="Choose a type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_date">Rough start date</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Rough end date</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Initial notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything else helpful at this stage…"
              rows={4}
              disabled={submitting}
            />
          </div>
        </CardContent>

        <CardFooter>
          <Button
            type="submit"
            className="w-full"
            disabled={submitting || !title.trim()}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Create event"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
