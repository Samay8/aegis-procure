"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { useState } from "react";
import { vendorName } from "@/data/vendors";
import { formatDateTime, formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Bid, Tender } from "@/types";
import { Segmented } from "@/components/ui/tabs";
import { CHART } from "./theme";

/**
 * Bids side by side. Full scale starts at zero; the zoomed view is labeled
 * with its axis start so closeness is never exaggerated silently.
 */
export function BidComparison({
  tender,
  bids,
  benchmark,
  highlightVendorIds = [],
}: {
  tender: Tender;
  bids: Bid[];
  benchmark?: number;
  highlightVendorIds?: string[];
}) {
  const [scale, setScale] = useState<"full" | "zoom">("full");
  const ordered = [...bids].sort((a, b) => a.rank - b.rank);
  const amounts = bids.map((b) => b.amount);
  const maxAmount = Math.max(...amounts, benchmark ?? 0);
  const minAmount = Math.min(...amounts);
  const zoomFrom = minAmount * 0.985;
  const zoomTo = Math.max(...amounts) * 1.004;
  const position = (value: number) =>
    scale === "full" ? (value / (maxAmount * 1.04)) * 100 : ((value - zoomFrom) / (zoomTo - zoomFrom)) * 100;

  const qcbs = tender.evaluation === "QCBS";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-3">
          {scale === "full" ? "Axis starts at ₹0." : `Zoomed: axis starts at ${formatINR(zoomFrom)} to show the gaps between bids.`}
        </p>
        <Segmented
          label="Bid chart scale"
          value={scale}
          onChange={setScale}
          options={[
            { value: "full", label: "Full scale" },
            { value: "zoom", label: "Zoom to bids" },
          ]}
        />
      </div>

      <div className="relative">
        {benchmark != null && scale === "full" && (
          <div className="pointer-events-none absolute inset-y-0 left-[calc(11rem+12px)] right-[5.5rem] hidden sm:block" aria-hidden>
            <div className="absolute inset-y-[-8px] w-px bg-ink-2/70" style={{ left: `${position(benchmark)}%` }}>
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10.5px] text-ink-2">
                Comparable median {formatINR(benchmark)}
              </span>
            </div>
          </div>
        )}

        <ul className="space-y-3 pt-5">
          {ordered.map((bid, index) => {
            const winner = bid.outcome === "WON";
            const linked = highlightVendorIds.includes(bid.vendorId);
            return (
              <li key={bid.id} className="grid grid-cols-1 gap-1.5 sm:grid-cols-[11rem_1fr_5.5rem] sm:items-center sm:gap-3">
                <div className="min-w-0">
                  <Link href={`/vendors/${bid.vendorId}`} className="flex items-center gap-1.5 truncate text-[13px] font-medium text-ink hover:underline">
                    {winner && <Trophy aria-label="Winner" className="h-3.5 w-3.5 shrink-0 text-warn-ink" />}
                    <span className="truncate">{vendorName(bid.vendorId)}</span>
                  </Link>
                  <div className="text-[11px] text-ink-3">
                    {winner ? "Winner" : `Rank ${bid.rank}`}
                    {qcbs && bid.technicalScore != null && ` · tech ${bid.technicalScore} · combined ${bid.combinedScore?.toFixed(1)}`}
                    {linked && <span className="text-rel-ink"> · linked vendor</span>}
                  </div>
                </div>
                <div className="relative h-6 rounded-[3px] bg-panel-3/60">
                  <motion.div
                    className={cn("absolute inset-y-1 left-0 rounded-r-[4px]")}
                    style={{ background: winner ? CHART.risk : linked ? CHART.rel : CHART.series[0] }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(1, Math.min(100, position(bid.amount)))}%` }}
                    transition={{ duration: 0.7, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <div className="flex items-baseline justify-between gap-2 sm:block sm:text-right">
                  <div className="text-[13px] font-semibold tabular text-ink">{formatINR(bid.amount)}</div>
                  <div className="text-[11px] tabular text-ink-3">{formatDateTime(bid.submittedAt).replace(/ \d{4},/, ",")}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-3">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: CHART.risk }} /> Winning bid
        </span>
        {highlightVendorIds.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: CHART.rel }} /> Bidder with a relationship signal
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: CHART.series[0] }} /> Other bids
        </span>
        {benchmark != null && (
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-px bg-ink-2" /> Comparable median (full scale)
          </span>
        )}
      </div>
    </div>
  );
}
