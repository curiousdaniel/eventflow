import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardFilters } from "@/components/events/DashboardFilters";
import { listEvents } from "@/lib/events/queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const events = await listEvents();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            All LRDC events at a glance.
          </p>
        </div>
        <Button asChild>
          <Link href="/events/new">
            <Plus className="size-4" aria-hidden />
            New Event
          </Link>
        </Button>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No events yet</CardTitle>
            <CardDescription>
              Click <span className="font-medium">New Event</span> to start a
              conversation with Claude and seed your first event record.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Events you create will appear here as cards, with stage,
            completeness score, and last-updated information.
          </CardContent>
        </Card>
      ) : (
        <DashboardFilters events={events} />
      )}
    </div>
  );
}
