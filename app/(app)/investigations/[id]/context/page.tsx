import type { Metadata } from "next";
import { ContextTab } from "@/components/case/context-tab";

export const metadata: Metadata = { title: "Context check" };

export default async function CaseContextPage({ params }: PageProps<"/investigations/[id]/context">) {
  const { id } = await params;
  return <ContextTab caseId={decodeURIComponent(id)} />;
}
