import type { Metadata } from "next";
import { WorkspaceTab } from "@/components/case/workspace-tab";

export const metadata: Metadata = { title: "Workspace" };

export default async function CaseWorkspacePage({ params }: PageProps<"/investigations/[id]/workspace">) {
  const { id } = await params;
  return <WorkspaceTab caseId={decodeURIComponent(id)} />;
}
