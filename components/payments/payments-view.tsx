"use client";

import Link from "next/link";
import { SearchX, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { PAYMENT_STATS } from "@/data/analytics";
import { CONTRACTS, CONTRACT_BY_ID, PAYMENTS } from "@/data/procurement";
import { SIGNALS } from "@/data/signals";
import { vendorName } from "@/data/vendors";
import { formatDate, formatINR, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Contract, PaymentType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Checkbox, SearchInput, Select } from "@/components/ui/fields";
import { Pagination, Stat } from "@/components/ui/misc";
import { PageHeader, Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { SimpleBars } from "@/components/charts/series-charts";
import { CHART } from "@/components/charts/theme";
import { useElementWidth } from "@/components/charts/chart-tooltip";
import { SignalRow } from "@/components/signals/signal-list";

const PAGE_SIZE = 30;

const TYPE_LABEL: Record<PaymentType, string> = {
  ADVANCE: "Advance",
  RUNNING_BILL: "Running bill",
  FINAL_BILL: "Final bill",
  RETENTION_RELEASE: "Retention release",
  SUPPLY_INVOICE: "Supply invoice",
};

/** Is money moving ahead of work? Each dot is a contract: progress on x, share paid on y. */
function PaidVsProgress() {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<Contract | null>(null);
  const height = 260;
  const pad = { left: 40, right: 12, top: 12, bottom: 32 };
  const points = CONTRACTS.filter((c) => c.paidToDate > 0);
  const x = (v: number) => pad.left + v * (Math.max(1, width) - pad.left - pad.right);
  const y = (v: number) => pad.top + (1 - Math.min(1.05, v) / 1.05) * (height - pad.top - pad.bottom);

  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Share of contract value paid against physical progress">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke={CHART.grid} />
              <text x={pad.left - 6} y={y(t) + 4} textAnchor="end" fill={CHART.tick} fontSize={10.5}>
                {Math.round(t * 100)}%
              </text>
              <text x={x(t)} y={height - 12} textAnchor="middle" fill={CHART.tick} fontSize={10.5}>
                {Math.round(t * 100)}%
              </text>
            </g>
          ))}
          <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} stroke={CHART.cursor} />
          <text x={x(0.62)} y={y(0.62) - 8} fill={CHART.tick} fontSize={10.5} transform={`rotate(${-Math.atan2(y(0) - y(1), x(1) - x(0)) * (180 / Math.PI)} ${x(0.62)} ${y(0.62) - 8})`}>
            paid = progress
          </text>
          {points.map((c) => {
            const paid = c.paidToDate / c.value;
            const ahead = paid - c.progress > 0.2;
            return (
              <g key={c.id} onMouseEnter={() => setHover(c)} onMouseLeave={() => setHover(null)}>
                <circle cx={x(c.progress)} cy={y(paid)} r={10} fill="transparent" />
                <circle cx={x(c.progress)} cy={y(paid)} r={ahead ? 5 : 3.5} fill={ahead ? CHART.risk : CHART.series[0]} fillOpacity={ahead ? 1 : 0.55} stroke={CHART.surface} strokeWidth={1.5} />
              </g>
            );
          })}
        </svg>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink-3">
        <span>Horizontal: physical progress · Vertical: share of value paid</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: CHART.risk }} /> Paid more than 20 points ahead of progress
          </span>
        </span>
      </div>
      {hover && (
        <div className="pointer-events-none absolute right-2 top-2 max-w-64 rounded-[5px] border border-line-strong bg-[#0d1014]/95 px-3 py-2 text-xs shadow-xl">
          <div className="font-semibold text-ink">{hover.title}</div>
          <div className="text-ink-3">{vendorName(hover.vendorId)}</div>
          <div className="mt-1 tabular text-ink-2">
            {Math.round(hover.progress * 100)}% progress · {Math.round((hover.paidToDate / hover.value) * 100)}% paid
          </div>
        </div>
      )}
    </div>
  );
}

export function PaymentsView({ initialPayment }: { initialPayment?: string }) {
  const [query, setQuery] = useState(initialPayment ?? "");
  const [type, setType] = useState<PaymentType | "ALL">("ALL");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [uncertifiedOnly, setUncertifiedOnly] = useState(false);
  const [page, setPage] = useState(1);

  const histogram = useMemo(() => {
    const buckets = ["0–10", "11–20", "21–30", "31–40", "41–50", "51–60", "60+"];
    const counts = buckets.map((label) => ({ label, payments: 0, flagged: 0 }));
    for (const p of PAYMENTS) {
      const index = Math.min(6, Math.floor(Math.max(0, p.daysToPay - 1) / 10));
      counts[index].payments += 1;
      if (p.flagged || !p.milestoneCertified) counts[index].flagged += 1;
    }
    return counts;
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PAYMENTS.filter((p) => {
      if (type !== "ALL" && p.type !== type) return false;
      if (flaggedOnly && !p.flagged) return false;
      if (uncertifiedOnly && p.milestoneCertified) return false;
      if (q && ![p.id, p.contractId, p.invoiceNo, vendorName(p.vendorId), CONTRACT_BY_ID.get(p.contractId)?.title ?? ""].join(" ").toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => (a.paidOn < b.paidOn ? 1 : -1));
  }, [query, type, flaggedOnly, uncertifiedOnly]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const paymentSignals = SIGNALS.filter((s) => s.category === "PAYMENT");
  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        meta={
          <>
            <Wallet className="h-3.5 w-3.5" /> {formatNumber(PAYMENT_STATS.count)} payments · {formatINR(PAYMENT_STATS.total)} released
          </>
        }
        title="Payments"
        description="Invoices and releases from the treasury register, measured against contract progress and milestone certification."
      />

      <div className="grid grid-cols-2 gap-4 rounded-md border border-line bg-panel p-4 sm:grid-cols-5">
        <Stat label="Payments" value={formatNumber(PAYMENT_STATS.count)} />
        <Stat label="Released" value={formatINR(PAYMENT_STATS.total)} />
        <Stat label="Median days to pay" value={`${PAYMENT_STATS.medianDays} days`} />
        <Stat label="Flagged payments" value={PAYMENT_STATS.flagged} tone="risk" />
        <Stat label="Uncertified releases" value={PAYMENT_STATS.uncertified} tone="warn" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHeader title="Is money moving ahead of work?" description="Contracts paid well ahead of recorded progress deserve a look at measurement and certification records." />
          <PanelBody>
            <PaidVsProgress />
          </PanelBody>
        </Panel>
        <Panel>
          <PanelHeader title="How quickly are invoices paid?" description="Days from invoice to release. Unusually fast releases matter only alongside other signals." />
          <PanelBody>
            <SimpleBars
              data={histogram}
              xKey="label"
              series={[
                { key: "payments", name: "Payments", color: CHART.series[0] },
                { key: "flagged", name: "Flagged or uncertified", color: CHART.risk },
              ]}
              height={260}
              labelFormatter={(label) => `${String(label)} days`}
            />
          </PanelBody>
        </Panel>
      </div>

      <Panel>
        <PanelHeader title="Payment pattern signals" description="Each is a lead for review, with its own context and alternative explanations." />
        <div className="px-1 py-1">
          {paymentSignals.map((signal) => (
            <SignalRow key={signal.id} signal={signal} />
          ))}
        </div>
      </Panel>

      <Panel>
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
          <SearchInput value={query} onChange={(v) => reset(() => setQuery(v))} placeholder="Search payment, invoice, contract or vendor…" className="lg:w-80" label="Search payments" />
          <Select aria-label="Payment type" value={type} onChange={(e) => reset(() => setType(e.target.value as PaymentType | "ALL"))} wrapperClassName="lg:w-52">
            <option value="ALL">All payment types</option>
            {Object.entries(TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <div className="flex flex-wrap gap-4">
            <Checkbox checked={flaggedOnly} onChange={(v) => reset(() => setFlaggedOnly(v))} label="Flagged only" />
            <Checkbox checked={uncertifiedOnly} onChange={(v) => reset(() => setUncertifiedOnly(v))} label="Uncertified only" />
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={SearchX} title="No payments found" description="No payments match these filters." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-[13px]">
                <thead className="border-b border-line text-[11px] uppercase tracking-[0.08em] text-ink-3">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Payment</th>
                    <th className="px-4 py-2.5 font-medium">Contract</th>
                    <th className="px-4 py-2.5 font-medium">Vendor</th>
                    <th className="px-4 py-2.5 font-medium">Type</th>
                    <th className="px-4 py-2.5 font-medium">Invoice</th>
                    <th className="px-4 py-2.5 font-medium">Paid on</th>
                    <th className="px-4 py-2.5 text-right font-medium">Days</th>
                    <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                    <th className="px-4 py-2.5 font-medium">Certified</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((p) => {
                    const contract = CONTRACT_BY_ID.get(p.contractId);
                    return (
                      <tr key={p.id} className={cn("border-b border-line last:border-0", p.flagged ? "bg-risk/[0.05]" : "hover:bg-panel-2", p.id === initialPayment && "ring-1 ring-inset ring-accent/50")}>
                        <td className="px-4 py-2.5 font-mono text-[12px] text-ink-2">{p.id}</td>
                        <td className="px-4 py-2.5">
                          <Link href={`/contracts?contract=${p.contractId}`} className="font-mono text-[12px] text-ink-2 hover:text-accent-ink">
                            {p.contractId}
                          </Link>
                          <div className="max-w-[14rem] truncate text-[11px] text-ink-3">{contract?.title}</div>
                        </td>
                        <td className="max-w-[12rem] truncate px-4 py-2.5 text-ink">{vendorName(p.vendorId)}</td>
                        <td className="px-4 py-2.5 text-ink-2">{TYPE_LABEL[p.type]}</td>
                        <td className="px-4 py-2.5 font-mono text-[11px] text-ink-3">
                          {p.invoiceNo}
                          <div className="font-sans tabular">{formatDate(p.invoiceOn)}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 tabular text-ink-3">{formatDate(p.paidOn)}</td>
                        <td className="px-4 py-2.5 text-right tabular text-ink-2">{p.daysToPay}</td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right tabular text-ink">{formatINR(p.amount)}</td>
                        <td className="px-4 py-2.5">
                          {p.flagged ? <Badge tone="risk">Flagged</Badge> : p.milestoneCertified ? <Badge tone="ok">Yes</Badge> : <Badge tone="warn">No</Badge>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={current} pageCount={pageCount} onPage={setPage} total={rows.length} pageSize={PAGE_SIZE} />
          </>
        )}
      </Panel>
    </div>
  );
}
