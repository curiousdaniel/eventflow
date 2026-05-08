"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateEventPanel } from "@/lib/events/actions";
import type { PanelKey } from "@/lib/schemas";

/**
 * Save-on-blur helper used by each event panel.
 *
 * Pattern in a panel:
 *   const { save, saving } = usePanelSaver(event.id, "core");
 *   <Input
 *     defaultValue={event.core.teacher ?? ""}
 *     onBlur={(e) => save({ teacher: e.target.value || undefined })}
 *   />
 */
export function usePanelSaver(eventId: string, panel: PanelKey) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);

  const save = useCallback(
    async (patch: Record<string, unknown>) => {
      const fieldKey = Object.keys(patch).join(", ");
      setSaving(fieldKey);
      try {
        await updateEventPanel(eventId, panel, patch);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Save failed");
      } finally {
        setSaving(null);
      }
    },
    [eventId, panel, router],
  );

  return { save, saving };
}
