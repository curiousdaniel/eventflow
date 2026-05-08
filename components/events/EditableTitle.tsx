"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { updateEventTitle } from "@/lib/events/actions";

export function EditableTitle({
  eventId,
  initialTitle,
}: {
  eventId: string;
  initialTitle: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialTitle);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setValue(initialTitle);
  }, [initialTitle]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function commit() {
    const next = value.trim();
    if (!next || next === initialTitle) {
      setValue(initialTitle);
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await updateEventTitle(eventId, next);
      router.refresh();
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
      setValue(initialTitle);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void commit();
          } else if (e.key === "Escape") {
            setValue(initialTitle);
            setEditing(false);
          }
        }}
        disabled={saving}
        className="h-9 text-xl font-semibold"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        "group flex items-center gap-2 rounded px-1 -mx-1 text-xl font-semibold tracking-tight",
        "hover:bg-accent",
      )}
      aria-label="Edit title"
    >
      <span>{value}</span>
      <Pencil
        className="size-4 text-muted-foreground opacity-0 transition group-hover:opacity-100"
        aria-hidden
      />
    </button>
  );
}
