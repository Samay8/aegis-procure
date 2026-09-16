import type { Metadata } from "next";
import { ClosingStatement } from "@/components/landing/closing";

export const metadata: Metadata = { title: "Where to look" };

export default function ClosingPage() {
  return <ClosingStatement />;
}
