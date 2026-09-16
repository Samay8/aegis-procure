import { BID_BY_ID, CONTRACT_BY_ID, PAYMENT_BY_ID } from "@/data/procurement";

/** Where a record identifier opens inside the platform. */
export function recordHref(id: string): string | undefined {
  if (id.startsWith("TND-")) return `/procurement/${id}`;
  if (id.startsWith("V-")) return `/vendors/${id}`;
  if (id.startsWith("INV-")) return `/investigations/${id}`;
  if (id.startsWith("SIG-")) return `/alerts?signal=${id}`;
  if (id.startsWith("REL-")) return `/relationships?relationship=${id}`;
  if (id.startsWith("BID-")) {
    const bid = BID_BY_ID.get(id);
    return bid ? `/procurement/${bid.tenderId}#bids` : undefined;
  }
  if (id.startsWith("CTR-")) return CONTRACT_BY_ID.get(id) ? `/contracts?contract=${id}` : undefined;
  if (id.startsWith("PAY-")) {
    const payment = PAYMENT_BY_ID.get(id);
    return payment ? `/payments?payment=${id}` : undefined;
  }
  return undefined;
}

export type RecordKind = "procurement" | "bid" | "vendor" | "relationship" | "payment" | "contract" | "comparable" | "signal" | "case" | "document";

export function recordKind(id: string): RecordKind {
  const prefix = id.split("-")[0];
  switch (prefix) {
    case "TND":
    case "AWD":
    case "EVR":
    case "PO":
      return "procurement";
    case "BID":
      return "bid";
    case "V":
    case "VRF":
    case "VEN":
    case "DIR":
      return "vendor";
    case "REL":
    case "PART":
      return "relationship";
    case "PAY":
    case "ADV":
      return "payment";
    case "CTR":
      return "contract";
    case "CMP":
    case "MCI":
      return "comparable";
    case "SIG":
      return "signal";
    case "INV":
      return "case";
    default:
      return "document";
  }
}
