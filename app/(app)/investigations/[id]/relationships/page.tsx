import type { Metadata } from "next";
import { RelationshipsTab } from "@/components/case/relationships-tab";

export const metadata: Metadata = { title: "Case relationships" };

export default async function CaseRelationshipsPage({ params }: PageProps<"/investigations/[id]/relationships">) {
  const { id } = await params;
  return <RelationshipsTab caseId={decodeURIComponent(id)} />;
}
