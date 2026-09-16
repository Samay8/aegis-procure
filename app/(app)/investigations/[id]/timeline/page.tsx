import type { Metadata } from "next";
import { TimelineTab } from "@/components/case/timeline-tab";

export const metadata: Metadata = { title: "Timeline" };

export default async function CaseTimelinePage({ params }: PageProps<"/investigations/[id]/timeline">) {
  const { id } = await params;
  return <TimelineTab caseId={decodeURIComponent(id)} />;
}
