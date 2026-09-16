import type { Metadata } from "next";
import { BidsTab } from "@/components/case/bids-tab";

export const metadata: Metadata = { title: "Bids & comparables" };

export default async function CaseBidsPage({ params }: PageProps<"/investigations/[id]/bids">) {
  const { id } = await params;
  return <BidsTab caseId={decodeURIComponent(id)} />;
}
