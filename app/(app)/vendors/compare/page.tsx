import type { Metadata } from "next";
import { VendorCompare } from "@/components/vendors/vendor-compare";

export const metadata: Metadata = { title: "Compare vendors" };

export default async function ComparePage({ searchParams }: PageProps<"/vendors/compare">) {
  const params = await searchParams;
  const a = typeof params.a === "string" ? params.a : undefined;
  const b = typeof params.b === "string" ? params.b : undefined;
  return <VendorCompare initialA={a} initialB={b} />;
}
