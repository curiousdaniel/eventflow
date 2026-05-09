"use client";

import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { EventAlert } from "@/lib/completeness";

const ICON: Record<EventAlert["severity"], typeof AlertCircle> = {
  danger: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const VARIANT_CLASSES: Record<EventAlert["severity"], string> = {
  danger:
    "border-destructive/40 bg-destructive/5 text-destructive [&>svg]:text-destructive",
  warning:
    "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 [&>svg]:text-amber-600",
  info:
    "border-blue-500/40 bg-blue-500/5 text-blue-800 dark:text-blue-300 [&>svg]:text-blue-600",
};

export function EventAlertsBanner({ alerts }: { alerts: EventAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {alerts.map((alert) => {
        const Icon = ICON[alert.severity];
        return (
          <Alert
            key={alert.id}
            className={cn("border", VARIANT_CLASSES[alert.severity])}
          >
            <Icon className="size-4" />
            <AlertTitle>{alert.title}</AlertTitle>
            {alert.description ? (
              <AlertDescription>{alert.description}</AlertDescription>
            ) : null}
          </Alert>
        );
      })}
    </div>
  );
}
