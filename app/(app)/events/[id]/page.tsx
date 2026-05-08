import { notFound } from "next/navigation";
import { EventWorkspace } from "@/components/events/EventWorkspace";
import {
  getEventById,
  getEventHistory,
  getEventMessages,
} from "@/lib/events/queries";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

export default async function EventPage({ params }: PageProps) {
  const event = await getEventById(params.id);
  if (!event) notFound();

  const [messages, history] = await Promise.all([
    getEventMessages(event.id),
    getEventHistory(event.id),
  ]);

  return (
    <EventWorkspace
      event={event}
      initialMessages={messages}
      history={history}
    />
  );
}
