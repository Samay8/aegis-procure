import type { Metadata } from "next";
import { QueueView } from "@/components/investigations/queue-view";

export const metadata: Metadata = { title: "Investigations" };

export default function InvestigationsPage() {
  return <QueueView />;
}
