import type { Metadata } from "next";
import { SummaryTab } from "@/components/case/summary-tab";

export async function generateMetadata({ params }: PageProps<"/investigations/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `${decodeURIComponent(id)} · Why flagged` };
}

export default async function CaseSummaryPage({ params }: PageProps<"/investigations/[id]">) {
  const { id } = await params;
  return <SummaryTab caseId={decodeURIComponent(id)} />;
}
