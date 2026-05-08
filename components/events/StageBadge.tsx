import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STAGE_LABELS, type EventStage } from "@/lib/schemas";

const STAGE_STYLES: Record<EventStage, string> = {
  seed: "bg-stone-200 text-stone-800 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-800",
  planning:
    "bg-amber-100 text-amber-900 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-200 dark:hover:bg-amber-950",
  confirmed:
    "bg-blue-100 text-blue-900 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-200 dark:hover:bg-blue-950",
  in_promotion:
    "bg-violet-100 text-violet-900 hover:bg-violet-100 dark:bg-violet-950 dark:text-violet-200 dark:hover:bg-violet-950",
  active:
    "bg-emerald-100 text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-200 dark:hover:bg-emerald-950",
  complete:
    "bg-zinc-200 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800",
};

export function StageBadge({
  stage,
  className,
}: {
  stage: EventStage;
  className?: string;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn("border-transparent", STAGE_STYLES[stage], className)}
    >
      {STAGE_LABELS[stage]}
    </Badge>
  );
}
