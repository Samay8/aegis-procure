import type { Metadata } from "next";
import { InvestigationBrief } from "@/components/case/brief";

export async function generateMetadata({ params }: PageProps<"/reports/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Brief · ${decodeURIComponent(id)}` };
}

export default async function ReportPage({ params }: PageProps<"/reports/[id]">) {
  const { id } = await params;
  return <InvestigationBrief caseId={decodeURIComponent(id)} standalone />;
}
