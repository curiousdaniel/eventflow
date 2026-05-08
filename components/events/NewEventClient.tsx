"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeedConversation } from "@/components/claude/SeedConversation";
import { QuickCreateForm } from "@/components/events/QuickCreateForm";

type Mode = "claude" | "quick";

export function NewEventClient() {
  const [mode, setMode] = useState<Mode>("claude");

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link href="/dashboard">
            <ArrowLeft className="size-4" aria-hidden />
            Back to dashboard
          </Link>
        </Button>
        <button
          type="button"
          onClick={() => setMode(mode === "claude" ? "quick" : "claude")}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {mode === "claude"
            ? "Use quick form instead"
            : "Use Claude conversation instead"}
        </button>
      </div>

      {mode === "claude" ? <SeedConversation /> : <QuickCreateForm />}
    </div>
  );
}
