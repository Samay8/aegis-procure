"use client";

import Link from "next/link";
import { BIDS_BY_TENDER } from "@/data/procurement";
import { vendorName } from "@/data/vendors";
import { formatINR, formatMonthShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Tender } from "@/types";

/**
 * Who bid and who won, package by package. Rows are ordered by first win so a
 * rotation reads as a staircase.
 */
export function ParticipationMatrix({ tenders, focusTenderId }: { tenders: Tender[]; focusTenderId?: string }) {
  const ordered = [...tenders].sort((a, b) => ((a.awardedOn ?? a.publishedOn) < (b.awardedOn ?? b.publishedOn) ? -1 : 1));
  const vendorOrder: string[] = [];
  for (const tender of ordered) {
    if (tender.winnerVendorId && !vendorOrder.includes(tender.winnerVendorId)) vendorOrder.push(tender.winnerVendorId);
  }
  for (const tender of ordered) {
    for (const bid of BIDS_BY_TENDER.get(tender.id) ?? []) if (!vendorOrder.includes(bid.vendorId)) vendorOrder.push(bid.vendorId);
  }
  // Vendors present in (nearly) every package first, in order of first win; outsiders last.
  const bidCounts = new Map(
    vendorOrder.map((v) => [v, ordered.filter((t) => (BIDS_BY_TENDER.get(t.id) ?? []).some((b) => b.vendorId === v)).length]),
  );
  const group = vendorOrder.filter((v) => (bidCounts.get(v) ?? 0) >= ordered.length - 1);
  const others = vendorOrder.filter((v) => !group.includes(v));
  const finalRows = [...group, ...others];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-separate border-spacing-0 text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-44 bg-panel pb-2 text-left font-medium text-ink-3">Vendor</th>
            {ordered.map((tender) => (
              <th
                key={tender.id}
                scope="col"
                className={cn("px-1 pb-2 text-center font-medium", tender.id === focusTenderId ? "text-ink" : "text-ink-3")}
              >
                <Link href={`/procurement/${tender.id}`} className="block hover:text-ink" title={tender.title}>
                  <span className="block">{tender.zone?.replace("Zone ", "Z") ?? "—"}</span>
                  <span className="block text-[10px] font-normal tabular">{formatMonthShort(tender.awardedOn ?? tender.publishedOn)}</span>
                </Link>
              </th>
            ))}
            <th className="pb-2 pl-3 text-right font-medium text-ink-3">Wins</th>
          </tr>
        </thead>
        <tbody>
          {finalRows.map((vendorId) => {
            const wins = ordered.filter((t) => t.winnerVendorId === vendorId).length;
            return (
              <tr key={vendorId}>
                <th scope="row" className="sticky left-0 z-10 max-w-44 truncate bg-panel py-1.5 pr-3 text-left font-normal">
                  <Link href={`/vendors/${vendorId}`} className="text-ink-2 hover:text-ink">
                    {vendorName(vendorId)}
                  </Link>
                </th>
                {ordered.map((tender) => {
                  const bid = (BIDS_BY_TENDER.get(tender.id) ?? []).find((b) => b.vendorId === vendorId);
                  const won = tender.winnerVendorId === vendorId;
                  return (
                    <td key={tender.id} className={cn("px-1 py-1.5 text-center", tender.id === focusTenderId && "bg-accent/[0.06]")}>
                      <span
                        className={cn(
                          "mx-auto flex h-6 w-6 items-center justify-center rounded-[3px]",
                          won ? (tender.id === focusTenderId ? "bg-risk" : "bg-accent") : bid ? "border border-[#4a525e]" : "",
                        )}
                        title={bid ? `${vendorName(vendorId)} · ${formatINR(bid.amount)}${won ? " · winner" : ""}` : "Did not bid"}
                      >
                        {!bid && <span className="h-px w-2 bg-line-strong" />}
                      </span>
                    </td>
                  );
                })}
                <td className="py-1.5 pl-3 text-right tabular text-ink-2">{wins}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-3">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[2px] bg-accent" /> Won
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[2px] bg-risk" /> Won — package under review
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[2px] border border-[#4a525e]" /> Bid, not awarded
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-px w-3 bg-line-strong" /> Did not bid
        </span>
      </div>
    </div>
  );
}
