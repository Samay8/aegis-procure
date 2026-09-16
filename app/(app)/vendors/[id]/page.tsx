import type { Metadata } from "next";
import { VENDOR_BY_ID } from "@/data/vendors";
import { VendorProfile } from "@/components/vendors/vendor-profile";

export async function generateMetadata({ params }: PageProps<"/vendors/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: VENDOR_BY_ID[decodeURIComponent(id)]?.name ?? "Vendor" };
}

export default async function VendorPage({ params }: PageProps<"/vendors/[id]">) {
  const { id } = await params;
  return <VendorProfile vendorId={decodeURIComponent(id)} />;
}
