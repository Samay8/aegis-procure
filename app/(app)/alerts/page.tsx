import type { Metadata } from "next";
import { AlertCenter } from "@/components/signals/alert-center";

export const metadata: Metadata = { title: "Signal center" };

export default async function AlertsPage({ searchParams }: PageProps<"/alerts">) {
  const params = await searchParams;
  const signal = typeof params.signal === "string" ? params.signal : undefined;
  return <AlertCenter key={signal ?? "all"} initialSignal={signal} />;
}
