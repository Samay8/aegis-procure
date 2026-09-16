import type { Metadata } from "next";
import { ContractsView } from "@/components/contracts/contracts-view";

export const metadata: Metadata = { title: "Contracts" };

export default async function ContractsPage({ searchParams }: PageProps<"/contracts">) {
  const params = await searchParams;
  const contract = typeof params.contract === "string" ? params.contract : undefined;
  return <ContractsView key={contract ?? "all"} initialContract={contract} />;
}
