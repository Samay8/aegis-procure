import type { Metadata } from "next";
import { SearchView } from "@/components/search/search-view";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  return <SearchView key={q} initialQuery={q} />;
}
