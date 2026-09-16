import type { Metadata } from "next";
import { TENDER_BY_ID } from "@/data/procurement";
import { ProcurementDetail } from "@/components/procurement/procurement-detail";

export async function generateMetadata({ params }: PageProps<"/procurement/[id]">): Promise<Metadata> {
  const { id } = await params;
  const tender = TENDER_BY_ID.get(decodeURIComponent(id));
  return { title: tender ? `${tender.id} · ${tender.title}` : "Procurement record" };
}

export default async function ProcurementDetailPage({ params }: PageProps<"/procurement/[id]">) {
  const { id } = await params;
  return <ProcurementDetail tenderId={decodeURIComponent(id)} />;
}
