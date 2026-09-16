import type { Metadata } from "next";
import { AssistantTab } from "@/components/case/assistant-tab";

export const metadata: Metadata = { title: "AI assistant" };

export default async function CaseAssistantPage({ params }: PageProps<"/investigations/[id]/assistant">) {
  const { id } = await params;
  return <AssistantTab caseId={decodeURIComponent(id)} />;
}
