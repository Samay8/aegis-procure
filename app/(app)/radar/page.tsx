import type { Metadata } from "next";
import { SIGNAL_CATEGORY_ORDER } from "@/data/reference";
import { RadarView } from "@/components/investigations/radar-view";
import type { SignalCategory } from "@/types";

export const metadata: Metadata = { title: "Anomaly Radar" };

export default async function RadarPage({ searchParams }: PageProps<"/radar">) {
  const params = await searchParams;
  const raw = typeof params.category === "string" ? params.category.toUpperCase() : undefined;
  const category = SIGNAL_CATEGORY_ORDER.includes(raw as SignalCategory) ? (raw as SignalCategory) : undefined;
  return <RadarView initialCategory={category} />;
}
