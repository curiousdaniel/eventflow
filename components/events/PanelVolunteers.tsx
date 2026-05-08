"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import type { EventRow, VolunteerRole } from "@/lib/schemas";
import { usePanelSaver } from "@/components/events/usePanelSaver";

export function PanelVolunteers({ event }: { event: EventRow }) {
  const { save } = usePanelSaver(event.id, "volunteers");
  const [draft, setDraft] = useState<VolunteerRole>({ role: "" });

  function commitRoles(roles: VolunteerRole[]) {
    void save({ roles });
  }

  function updateRole(idx: number, patch: Partial<VolunteerRole>) {
    const next = event.volunteers.roles.map((r, i) =>
      i === idx ? { ...r, ...patch } : r,
    );
    commitRoles(next);
  }

  function removeRole(idx: number) {
    commitRoles(event.volunteers.roles.filter((_, i) => i !== idx));
  }

  function addRole() {
    if (!draft.role.trim()) return;
    commitRoles([
      ...event.volunteers.roles,
      {
        role: draft.role.trim(),
        assigned_to: draft.assigned_to?.trim() || undefined,
        notes: draft.notes?.trim() || undefined,
      },
    ]);
    setDraft({ role: "" });
  }

  return (
    <div className="space-y-5">
      {event.volunteers.roles.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No volunteer roles yet.
        </p>
      ) : (
        <div className="space-y-4">
          {event.volunteers.roles.map((r, idx) => (
            <div key={idx} className="grid gap-3 sm:grid-cols-[1fr,1fr,auto]">
              <div className="space-y-1">
                <Label htmlFor={`role-${idx}`} className="text-xs">
                  Role
                </Label>
                <Input
                  id={`role-${idx}`}
                  defaultValue={r.role}
                  onBlur={(e) => updateRole(idx, { role: e.target.value.trim() })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`assigned-${idx}`} className="text-xs">
                  Assigned to
                </Label>
                <Input
                  id={`assigned-${idx}`}
                  defaultValue={r.assigned_to ?? ""}
                  onBlur={(e) =>
                    updateRole(idx, {
                      assigned_to: e.target.value.trim() || undefined,
                    })
                  }
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeRole(idx)}
                  aria-label="Remove role"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="sm:col-span-3 space-y-1">
                <Label htmlFor={`notes-${idx}`} className="text-xs">
                  Notes
                </Label>
                <Textarea
                  id={`notes-${idx}`}
                  rows={2}
                  defaultValue={r.notes ?? ""}
                  onBlur={(e) =>
                    updateRole(idx, {
                      notes: e.target.value.trim() || undefined,
                    })
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <Separator />

      <div className="space-y-3">
        <h4 className="text-sm font-medium">Add a role</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            placeholder="Role (e.g. greeter)"
            value={draft.role}
            onChange={(e) => setDraft({ ...draft, role: e.target.value })}
          />
          <Input
            placeholder="Assigned to (optional)"
            value={draft.assigned_to ?? ""}
            onChange={(e) =>
              setDraft({ ...draft, assigned_to: e.target.value })
            }
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={addRole}
          disabled={!draft.role.trim()}
        >
          <Plus className="size-4" />
          Add role
        </Button>
      </div>
    </div>
  );
}
