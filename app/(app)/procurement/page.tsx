import type { Metadata } from "next";
import { ProcurementExplorer } from "@/components/procurement/explorer";

export const metadata: Metadata = { title: "Procurement Explorer" };

export default function ProcurementPage() {
  return <ProcurementExplorer />;
}
