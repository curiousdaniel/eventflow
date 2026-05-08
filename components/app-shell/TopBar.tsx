import { SignOutButton } from "@/components/app-shell/SignOutButton";

interface TopBarProps {
  displayName: string;
  email: string;
}

export function TopBar({ displayName, email }: TopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-6">
      <div className="text-sm text-muted-foreground">
        {/* Page-level title can be set per-page; left empty for now. */}
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden flex-col items-end leading-tight sm:flex">
          <span className="text-sm font-medium">
            {displayName || email.split("@")[0]}
          </span>
          <span className="text-xs text-muted-foreground">{email}</span>
        </div>
        <SignOutButton />
      </div>
    </header>
  );
}
