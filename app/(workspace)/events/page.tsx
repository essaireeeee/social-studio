import type { Metadata } from "next";
import { EventsPage } from "@/components/events/EventsPage";

export const metadata: Metadata = {
  title: "Événements · HEXAGONE MMA Social Studio",
};

export default function Page() {
  return <EventsPage />;
}
