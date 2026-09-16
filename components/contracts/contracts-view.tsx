"use client";

import Link from "next/link";
import { ArrowUpRight, ScrollText, SearchX, Split } from "lucide-react";
import { useMemo, useState } from "react";
import { caseForTender } from "@/data/cases";
import { CONTRACTS, CONTRACT_BY_ID, PAYMENTS_BY_CONTRACT, TENDER_BY_ID } from "@/data/procurement";
import { CATEGORIES, CATEGORY_BY_ID, DEPARTMENTS, DEPARTMENT_BY_ID } from "@/data/reference";
import { SIGNALS } from "@/data/signals";
import { vendorName } from "@/data/vendors";
import { formatDate, formatINR, formatNumber } from "@/lib/format";
import { cn, sum } from "@/lib/utils";
import type { Contract } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Checkbox, SearchInput, Select } from "@/components/ui/fields";
import { Pagination, Stat } from "@/components/ui/misc";
import { KeyValue, PageHeader, Panel, PanelHeader } from "@/components/ui/panel";
import { PRIORITY_TONE } from "@/components/ui/priority";
import { RecordChip } from "@/components/ui/record-chip";
import { EmptyState } from "@/components/ui/states";
import { CHART } from "@/components/charts/theme";

const PAGE_SIZE = 25;
const THRESHOLD = 2_500_000;

const SIGNALS_BY_TENDER = (() => {
  const map = new Map<string, typeof SIGNALS>();
  for (const signal of SIGNALS) {
    for (const id of signal.tenderIds) {
      const list = map.get(id) ?? [];
      list.push(signal);
      map.set(id, list);
    }
  }
  return map;
})();

function ProgressVsPaid({ contract }: { contract: Contract }) {
  const paid = Math.min(1, contract.paidToDate / contract.value);
  const ahead = paid - contract.progress > 0.2;
  return (
    <div className="min-w-[7.5rem]">
      <div className="relative h-1.5 overflow-hidden rounded-full bg-panel-3" aria-label={`Progress ${Math.round(contract.progress * 100)}%, paid ${Math.round(paid * 100)}%`} role="img">
        <div className="absolute inset-y-0 left-0 rounded-full bg-ok/55" style={{ width: `${contract.progress * 100}%` }} />
        <div className={cn("absolute inset-y-[-2px] w-[2px] rounded", ahead ? "bg-risk" : "bg-ink")} style={{ left: `calc(${paid * 100}% - 1px)` }} />
      </div>
      <div className="mt-1 flex justify-between text-[10.5px] tabular text-ink-3">
        <span>{Math.round(contract.progress * 100)}% done</span>
        <span className={ahead ? "text-risk-ink" : undefined}>{Math.round(paid * 100)}% paid</span>
      </div>
    </div>
  );
}

function ContractDrawer({ contract, onClose }: { contract: Contract | null; onClose: () => void }) {
  const tender = contract ? TENDER_BY_ID.get(contract.tenderId) : undefined;
  const payments = contract ? PAYMENTS_BY_CONTRACT.get(contract.id) ?? [] : [];
  const signals = contract ? SIGNALS_BY_TENDER.get(contract.tenderId) ?? [] : [];
  const investigation = contract ? caseForTender(contract.tenderId) : undefined;
  return (
    <Drawer open={Boolean(contract)} onClose={onClose} title={contract?.title ?? "Contract"} subtitle={contract?.id}>
      {contract && (
        <div className="space-y-5 p-5">
          <dl className="grid grid-cols-2 gap-4">
            <KeyValue label="Value" value={formatINR(contract.value)} />
            <KeyValue label="Status" value={contract.status === "ACTIVE" ? "Active" : "Completed"} />
            <KeyValue label="Vendor" value={<Link href={`/vendors/${contract.vendorId}`} className="text-accent-ink hover:underline">{vendorName(contract.vendorId)}</Link>} />
            <KeyValue label="Department" value={DEPARTMENT_BY_ID[contract.departmentId].short} />
            <KeyValue label="Signed" value={formatDate(contract.signedOn)} />
            <KeyValue label="Term" value={`${formatDate(contract.startOn)} – ${formatDate(contract.endOn)}`} />
          </dl>
          <ProgressVsPaid contract={contract} />
          {tender && (
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
              From tender <RecordChip id={tender.id} /> {tender.title}
            </div>
          )}
          {signals.length > 0 && (
            <div>
              <div className="type-label mb-2">Signals on the underlying procurement</div>
              <ul className="space-y-2">
                {signals.map((s) => (
                  <li key={s.id} className="rounded-[5px] border border-line p-2.5">
                    <div className="flex items-center gap-2">
                      <Badge tone={PRIORITY_TONE[s.severity]}>{s.severity.toLowerCase()}</Badge>
                      <span className="text-[13px] font-medium text-ink">{s.title}</span>
                    </div>
                    <p className="mt-1 text-xs text-ink-2">{s.headline}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <div className="type-label mb-2">Payments · {payments.length}</div>
            {payments.length ? (
              <ul className="divide-y divide-line rounded-[5px] border border-line">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                    <span className={cn("tabular", p.flagged ? "text-risk-ink" : "text-ink-2")}>
                      {formatDate(p.paidOn)} · {p.type.replaceAll("_", " ").toLowerCase()} · {p.invoiceNo}
                      {!p.milestoneCertified && " · not certified"}
                    </span>
                    <span className="tabular text-ink">{formatINR(p.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-ink-3">No payments released yet.</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {tender && (
              <ButtonLink href={`/procurement/${tender.id}`} size="sm">
                Open procurement <ArrowUpRight className="h-3.5 w-3.5" />
              </ButtonLink>
            )}
            {investigation && (
              <ButtonLink href={`/investigations/${investigation.id}`} size="sm" variant="primary">
                Open {investigation.id}
              </ButtonLink>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}

export function ContractsView({ initialContract }: { initialContract?: string }) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(initialContract && CONTRACT_BY_ID.has(initialContract) ? initialContract : null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CONTRACTS.filter((c) => {
      if (department !== "ALL" && c.departmentId !== department) return false;
      if (category !== "ALL" && c.categoryId !== category) return false;
      if (status !== "ALL" && c.status !== status) return false;
      if (flaggedOnly && !(SIGNALS_BY_TENDER.get(c.tenderId)?.length ?? 0)) return false;
      if (q && ![c.id, c.title, c.tenderId, vendorName(c.vendorId)].join(" ").toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => (a.signedOn < b.signedOn ? 1 : -1));
  }, [query, department, category, status, flaggedOnly]);

  const splitting = SIGNALS.filter((s) => s.type === "CONTRACT_SPLITTING");
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const total = sum(CONTRACTS.map((c) => c.value));
  const paid = sum(CONTRACTS.map((c) => c.paidToDate));
  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        meta={
          <>
            <ScrollText className="h-3.5 w-3.5" /> {formatNumber(CONTRACTS.length)} contracts · {formatINR(total)}
          </>
        }
        title="Contracts"
        description="Every signed contract with its progress, payments released and any signals on the procurement behind it."
      />

      <div className="grid grid-cols-2 gap-4 rounded-md border border-line bg-panel p-4 sm:grid-cols-3 xl:grid-cols-6">
        <Stat label="Contracts" value={formatNumber(CONTRACTS.length)} />
        <Stat label="Contract value" value={formatINR(total)} />
        <Stat label="Active" value={CONTRACTS.filter((c) => c.status === "ACTIVE").length} tone="accent" />
        <Stat label="Completed" value={CONTRACTS.filter((c) => c.status === "COMPLETED").length} tone="ok" />
        <Stat label="Paid to date" value={formatINR(paid)} hint={`${Math.round((paid / total) * 100)}% of value`} />
        <Stat label="With signals" value={CONTRACTS.filter((c) => SIGNALS_BY_TENDER.get(c.tenderId)?.length).length} tone="risk" />
      </div>

      <Panel>
        <PanelHeader
          title="Contract pattern signals"
          icon={<Split className="h-3.5 w-3.5" />}
          description="Purchases that sit just below the ₹25 L open-tender threshold and cluster in time. Separate indents can produce the same pattern."
        />
        <div className="grid grid-cols-1 gap-px bg-line lg:grid-cols-3">
          {splitting.map((signal) => {
            const tenders = signal.tenderIds.map((id) => TENDER_BY_ID.get(id)!).filter(Boolean);
            const combined = sum(tenders.map((t) => t.awardValue ?? 0));
            return (
              <div key={signal.id} className="bg-panel p-4">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={PRIORITY_TONE[signal.severity]}>{signal.severity.toLowerCase()}</Badge>
                  {signal.caseId ? <RecordChip id={signal.caseId} /> : <RecordChip id={signal.id} />}
                </div>
                <div className="mt-2 text-[14px] font-medium text-ink">{vendorName(signal.vendorIds[0])}</div>
                <div className="text-xs text-ink-3">
                  {tenders.length} purchases · combined {formatINR(combined)}
                </div>
                <ul className="mt-3 space-y-2">
                  {tenders.map((t) => (
                    <li key={t.id}>
                      <div className="flex justify-between text-[11px] text-ink-3">
                        <span className="truncate pr-2">{formatDate(t.awardedOn!)}</span>
                        <span className="tabular text-ink-2">{formatINR(t.awardValue ?? 0)}</span>
                      </div>
                      <div className="relative mt-1 h-2 rounded-[2px] bg-panel-3">
                        <div className="h-full rounded-r-[4px]" style={{ width: `${((t.awardValue ?? 0) / THRESHOLD) * 88}%`, background: CHART.series[3] }} />
                        <div className="absolute inset-y-[-3px] w-px bg-risk" style={{ left: "88%" }} title="₹25 L threshold" />
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 text-right text-[10.5px] text-risk-ink">│ ₹25.00 L threshold</div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel>
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
          <SearchInput value={query} onChange={(v) => reset(() => setQuery(v))} placeholder="Search contract, tender or vendor…" className="lg:w-72" label="Search contracts" />
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
            <Select aria-label="Department" value={department} onChange={(e) => reset(() => setDepartment(e.target.value))}>
              <option value="ALL">All departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.short}
                </option>
              ))}
            </Select>
            <Select aria-label="Category" value={category} onChange={(e) => reset(() => setCategory(e.target.value))}>
              <option value="ALL">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select aria-label="Contract status" value={status} onChange={(e) => reset(() => setStatus(e.target.value))}>
              <option value="ALL">Active and completed</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
            </Select>
          </div>
          <Checkbox checked={flaggedOnly} onChange={(v) => reset(() => setFlaggedOnly(v))} label="With signals" />
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={SearchX} title="No contracts found" description="No contracts match these filters." action={<Button size="sm" onClick={() => reset(() => { setQuery(""); setDepartment("ALL"); setCategory("ALL"); setStatus("ALL"); setFlaggedOnly(false); })}>Clear filters</Button>} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-[13px]">
                <thead className="border-b border-line text-[11px] uppercase tracking-[0.08em] text-ink-3">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Contract</th>
                    <th className="px-4 py-2.5 font-medium">Vendor</th>
                    <th className="px-4 py-2.5 font-medium">Department</th>
                    <th className="px-4 py-2.5 text-right font-medium">Value</th>
                    <th className="px-4 py-2.5 font-medium">Signed</th>
                    <th className="px-4 py-2.5 font-medium">Progress vs paid</th>
                    <th className="px-4 py-2.5 text-right font-medium">Signals</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((contract) => {
                    const signals = SIGNALS_BY_TENDER.get(contract.tenderId) ?? [];
                    return (
                      <tr key={contract.id} onClick={() => setOpenId(contract.id)} className={cn("cursor-pointer border-b border-line last:border-0 hover:bg-panel-2", openId === contract.id && "bg-panel-2")}>
                        <td className="px-4 py-2.5">
                          <div className="font-mono text-[12px] text-ink-2">{contract.id}</div>
                          <div className="max-w-[18rem] truncate text-xs text-ink-3">{contract.title}</div>
                        </td>
                        <td className="max-w-[12rem] truncate px-4 py-2.5 text-ink">{vendorName(contract.vendorId)}</td>
                        <td className="px-4 py-2.5 text-ink-2">
                          {DEPARTMENT_BY_ID[contract.departmentId].short}
                          <div className="text-[11px] text-ink-3">{CATEGORY_BY_ID[contract.categoryId].short}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right tabular text-ink">{formatINR(contract.value)}</td>
                        <td className="whitespace-nowrap px-4 py-2.5 tabular text-ink-3">{formatDate(contract.signedOn)}</td>
                        <td className="px-4 py-2.5">
                          <ProgressVsPaid contract={contract} />
                        </td>
                        <td className="px-4 py-2.5 text-right">{signals.length ? <Badge tone="risk">{signals.length}</Badge> : <span className="text-ink-3">0</span>}</td>
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

      <ContractDrawer contract={openId ? CONTRACT_BY_ID.get(openId) ?? null : null} onClose={() => setOpenId(null)} />
    </div>
  );
}
