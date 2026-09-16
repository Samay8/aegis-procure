import type { Metadata } from "next";
import { PaymentsView } from "@/components/payments/payments-view";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage({ searchParams }: PageProps<"/payments">) {
  const params = await searchParams;
  const payment = typeof params.payment === "string" ? params.payment : undefined;
  return <PaymentsView key={payment ?? "all"} initialPayment={payment} />;
}
