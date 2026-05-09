import { User } from "lucide-react";
import { formatRelative } from "@/lib/format";
import type { TeamMember } from "@/lib/team/queries";

function initials(name: string, fallback: string): string {
  const source = name?.trim() || fallback;
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  const out = `${first}${second}`.toUpperCase();
  return out || source.slice(0, 1).toUpperCase();
}

export function TeamList({
  members,
  currentUserId,
}: {
  members: TeamMember[];
  currentUserId: string;
}) {
  if (members.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <User className="mx-auto mb-2 size-6 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          No team members yet. Invite the first one above.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-5 py-3">
        <h2 className="text-base font-semibold">Team members</h2>
        <p className="text-xs text-muted-foreground">
          {members.length} member{members.length === 1 ? "" : "s"}
        </p>
      </div>
      <ul className="divide-y">
        {members.map((m) => {
          const isMe = m.id === currentUserId;
          const displayName = m.display_name || m.email || "Unnamed";
          return (
            <li key={m.id} className="flex items-center gap-4 px-5 py-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                {initials(m.display_name, m.email ?? "?")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{displayName}</span>
                  {isMe ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                      You
                    </span>
                  ) : null}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {m.email ?? "—"}
                </div>
              </div>
              <div className="hidden text-right text-xs text-muted-foreground md:block">
                <div>
                  Last active{" "}
                  <span className="text-foreground">
                    {formatRelative(m.last_active_at ?? m.last_seen_at)}
                  </span>
                </div>
                <div className="text-[11px]">
                  Joined {formatRelative(m.created_at)}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
