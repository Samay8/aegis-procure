import type { Metadata } from "next";
import { InvestigationBrief } from "@/components/case/brief";

export const metadata: Metadata = { title: "Investigation brief" };

export default async function CaseBriefPage({ params }: PageProps<"/investigations/[id]/brief">) {
  const { id } = await params;
  return <InvestigationBrief caseId={decodeURIComponent(id)} />;
}
