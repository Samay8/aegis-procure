import type { Metadata } from "next";
import { EvidenceTab } from "@/components/case/evidence-tab";

export const metadata: Metadata = { title: "Evidence" };

export default async function CaseEvidencePage({ params, searchParams }: PageProps<"/investigations/[id]/evidence">) {
  const { id } = await params;
  const query = await searchParams;
  const signal = typeof query.signal === "string" ? query.signal : undefined;
  return <EvidenceTab key={signal ?? "all"} caseId={decodeURIComponent(id)} initialSignal={signal} />;
}
