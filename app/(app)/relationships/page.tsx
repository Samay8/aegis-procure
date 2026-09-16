import type { Metadata } from "next";
import { RelationshipsView } from "@/components/network/relationships-view";

export const metadata: Metadata = { title: "Relationships" };

export default async function RelationshipsPage({ searchParams }: PageProps<"/relationships">) {
  const params = await searchParams;
  const focus = typeof params.focus === "string" ? params.focus : undefined;
  const relationship = typeof params.relationship === "string" ? params.relationship : undefined;
  return <RelationshipsView key={`${focus ?? ""}-${relationship ?? ""}`} focus={focus} relationshipId={relationship} />;
}
