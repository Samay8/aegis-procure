import { CaseFrame } from "@/components/case/case-frame";

export default async function CaseLayout({ children, params }: LayoutProps<"/investigations/[id]">) {
  const { id } = await params;
  return <CaseFrame caseId={decodeURIComponent(id)}>{children}</CaseFrame>;
}
