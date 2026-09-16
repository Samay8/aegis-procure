import { BIDS_BY_TENDER, CONTRACT_BY_TENDER, PAYMENTS_BY_CONTRACT } from "@/data/procurement";
import { CASE_TENDER } from "@/data/story";
import { vendorName } from "@/data/vendors";
import { formatINR } from "@/lib/format";
import type { InvestigationCase, Tender, TimelineEvent } from "@/types";

export function evaluationRecordId(tender: Tender) {
  return tender.id === CASE_TENDER ? "EVR-2026-0419" : `EVR-${tender.id.slice(4)}`;
}

export function awardRecordId(tender: Tender) {
  return tender.id === CASE_TENDER ? "AWD-2026-0733" : `AWD-${tender.id.slice(4)}`;
}

/** The procurement lifecycle for one tender, with investigation annotations overlaid. */
export function buildTimeline(tender: Tender, notes?: InvestigationCase["timelineNotes"]): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  events.push({
    id: `${tender.id}-published`,
    at: `${tender.publishedOn}T10:00`,
    kind: "TENDER",
    label: "Tender published",
    detail: `Estimate ${formatINR(tender.estimate)} · deadline ${tender.bidDeadline.replace("T", " ")}`,
    recordId: tender.id,
  });

  const bids = [...(BIDS_BY_TENDER.get(tender.id) ?? [])].sort((a, b) => (a.submittedAt < b.submittedAt ? -1 : 1));
  for (const bid of bids) {
    events.push({
      id: bid.id,
      at: bid.submittedAt,
      kind: "BID",
      label: `${vendorName(bid.vendorId)} submitted`,
      detail: `Bid of ${formatINR(bid.amount)}`,
      recordId: bid.id,
    });
  }

  if (tender.evaluatedOn) {
    events.push({
      id: `${tender.id}-evaluation`,
      at: `${tender.evaluatedOn}T16:00`,
      kind: "EVALUATION",
      label: "Evaluation",
      detail: tender.evaluation === "QCBS" ? "Technical and financial evaluation (QCBS 70:30)" : "Financial evaluation (lowest evaluated bid)",
      recordId: evaluationRecordId(tender),
    });
  }

  if (tender.awardedOn && tender.winnerVendorId) {
    events.push({
      id: `${tender.id}-award`,
      at: `${tender.awardedOn}T12:00`,
      kind: "AWARD",
      label: "Award",
      detail: `${vendorName(tender.winnerVendorId)} · ${formatINR(tender.awardValue ?? 0)}`,
      recordId: awardRecordId(tender),
    });
  }

  const contract = CONTRACT_BY_TENDER.get(tender.id);
  if (contract) {
    events.push({
      id: contract.id,
      at: `${contract.signedOn}T11:00`,
      kind: "CONTRACT",
      label: "Contract signed",
      detail: `${contract.id} · ${formatINR(contract.value)}`,
      recordId: contract.id,
    });
    for (const payment of (PAYMENTS_BY_CONTRACT.get(contract.id) ?? []).slice(0, 8)) {
      events.push({
        id: payment.id,
        at: `${payment.paidOn}T15:00`,
        kind: "PAYMENT",
        label: payment.type === "ADVANCE" ? "Advance released" : "Payment released",
        detail: `${formatINR(payment.amount)} · invoice ${payment.invoiceNo}${payment.milestoneCertified ? "" : " · not certified"}`,
        recordId: payment.id,
        unusual: payment.flagged,
      });
    }
  }

  return events
    .map((event) => {
      const note = event.recordId ? notes?.[event.recordId] : undefined;
      if (!note) return event;
      return {
        ...event,
        annotation: note.annotation,
        signalIds: note.signalIds,
        unusual: event.unusual || note.signalIds.length > 0,
      };
    })
    .sort((a, b) => (a.at < b.at ? -1 : 1));
}
