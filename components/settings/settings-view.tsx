"use client";

import { Check, Download, Lock, RotateCcw, Settings, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { ANALYSIS_JOBS, DATA_QUALITY, DATA_SOURCES, PLATFORM_USERS, ROLE_PERMISSIONS, SIGNAL_MODELS, SYSTEM_SERVICES } from "@/data/platform";
import { formatDateTime, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAegis } from "@/store/aegis";
import type { AuditActorKind } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/drawer";
import { SearchInput, Switch } from "@/components/ui/fields";
import { Meter } from "@/components/ui/misc";
import { PageHeader, Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { Segmented } from "@/components/ui/tabs";

type Tab = "system" | "models" | "users" | "audit" | "preferences";

function AuditLog() {
  const audit = useAegis((s) => s.audit);
  const [kind, setKind] = useState<AuditActorKind | "ALL">("ALL");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return audit.filter((entry) => {
      if (kind !== "ALL" && entry.actorKind !== kind) return false;
      if (q && ![entry.actor, entry.action, entry.target ?? "", entry.detail ?? ""].join(" ").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [audit, kind, query]);

  const exportCsv = () => {
    const escape = (v: string) => `"${v.replaceAll('"', '""')}"`;
    const csv = [
      ["Time (IST)", "Actor", "Actor type", "Action", "Target", "Detail"].map(escape).join(","),
      ...rows.map((r) => [r.at.replace("T", " "), r.actor, r.actorKind, r.action, r.target ?? "", r.detail ?? ""].map(escape).join(",")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "aegis-audit-log.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Panel>
      <PanelHeader
        title="System audit log"
        description="Every analysis run, data sync and investigator action, newest first. Entries cannot be edited."
        actions={
          <Button size="xs" variant="ghost" onClick={exportCsv} disabled={!rows.length}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        }
      />
      <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center">
        <SearchInput value={query} onChange={setQuery} placeholder="Search actions, cases or people…" className="md:w-72" label="Search audit log" />
        <Segmented
          label="Actor type"
          value={kind}
          onChange={setKind}
          options={[
            { value: "ALL", label: "All" },
            { value: "INVESTIGATOR", label: "Investigators" },
            { value: "SYSTEM", label: "System" },
            { value: "AI", label: "AI" },
            { value: "ADMIN", label: "Admin" },
          ]}
        />
      </div>
      {rows.length ? (
        <ol className="max-h-[640px] divide-y divide-line overflow-y-auto">
          {rows.map((entry) => (
            <li key={entry.id} className="grid grid-cols-1 gap-1 px-4 py-2.5 sm:grid-cols-[9.5rem_10rem_1fr] sm:gap-4">
              <span className="text-xs tabular text-ink-3">{formatDateTime(entry.at)}</span>
              <span className="flex items-center gap-2 text-[13px] text-ink-2">
                <span
                  aria-hidden
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    entry.actorKind === "SYSTEM" ? "bg-slate" : entry.actorKind === "AI" ? "bg-rel" : entry.actorKind === "ADMIN" ? "bg-warn" : "bg-accent",
                  )}
                />
                {entry.actor}
              </span>
              <span className="text-[13px] text-ink">
                {entry.action}
                {entry.target && <span className="ml-2 font-mono text-xs text-ink-3">{entry.target}</span>}
                {entry.detail && <span className="block text-xs text-ink-3">{entry.detail}</span>}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState title="No audit entries" description="No entries match these filters." />
      )}
    </Panel>
  );
}

export function SettingsView() {
  const [tab, setTab] = useState<Tab>("system");
  const prefs = useAegis((s) => s.prefs);
  const setPref = useAegis((s) => s.setPref);
  const resetDemo = useAegis((s) => s.resetDemo);
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        meta={
          <>
            <Settings className="h-3.5 w-3.5" /> Platform administration
          </>
        }
        title="Settings"
        description="System health, signal models, access control and the audit trail. Administration manages the platform; it never decides a case."
      />

      <Segmented
        label="Settings section"
        value={tab}
        onChange={setTab}
        options={[
          { value: "system", label: "System" },
          { value: "models", label: "Signal models" },
          { value: "users", label: "Users & roles" },
          { value: "audit", label: "Audit log" },
          { value: "preferences", label: "Preferences" },
        ]}
      />

      {tab === "system" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <Panel>
              <PanelHeader title="System health" />
              <ul className="divide-y divide-line">
                {SYSTEM_SERVICES.map((service) => (
                  <li key={service.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <div className="text-[14px] text-ink">{service.name}</div>
                      <div className="text-xs text-ink-3">{service.latency}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs tabular text-ink-3">{service.uptime} uptime</span>
                      <Badge tone={service.status === "OPERATIONAL" ? "ok" : "warn"}>{service.status.toLowerCase()}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel>
              <PanelHeader title="Analysis jobs" />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-[13px]">
                  <thead className="border-b border-line text-[11px] uppercase tracking-[0.08em] text-ink-3">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Job</th>
                      <th className="px-4 py-2.5 font-medium">Started</th>
                      <th className="px-4 py-2.5 font-medium">Duration</th>
                      <th className="px-4 py-2.5 text-right font-medium">Records</th>
                      <th className="px-4 py-2.5 font-medium">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ANALYSIS_JOBS.map((job) => (
                      <tr key={job.id} className="border-b border-line last:border-0">
                        <td className="px-4 py-2.5">
                          <div className="text-ink">{job.name}</div>
                          <div className="font-mono text-[11px] text-ink-3">{job.id}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 tabular text-ink-3">{formatDateTime(job.startedAt)}</td>
                        <td className="px-4 py-2.5 text-ink-2">{job.duration}</td>
                        <td className="px-4 py-2.5 text-right tabular text-ink-2">{formatNumber(job.records)}</td>
                        <td className="px-4 py-2.5 text-ink-2">{job.result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
          <div className="space-y-6">
            <Panel>
              <PanelHeader title="Data sources" />
              <ul className="divide-y divide-line">
                {DATA_SOURCES.map((source) => (
                  <li key={source.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]">
                    <span className="text-ink-2">{source.name}</span>
                    <span className="flex items-center gap-2">
                      <span className="tabular text-xs text-ink-3">{formatNumber(source.records)}</span>
                      <Badge tone={source.status === "CONNECTED" ? "ok" : "warn"}>{source.status.toLowerCase()}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel>
              <PanelHeader title="Data quality" />
              <PanelBody>
                <div className="flex items-baseline justify-between">
                  <span className="text-[13px] text-ink-2">Composite score</span>
                  <span className="type-title text-3xl tabular text-ink">{DATA_QUALITY.score}%</span>
                </div>
                <Meter value={DATA_QUALITY.score} tone="ok" className="mt-2" label="Data quality" />
              </PanelBody>
            </Panel>
          </div>
        </div>
      )}

      {tab === "models" && (
        <Panel>
          <PanelHeader title="Signal models" description="Versioned detection models. Precision is measured from investigator outcomes; calibration never changes a closed case." />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13px]">
              <thead className="border-b border-line text-[11px] uppercase tracking-[0.08em] text-ink-3">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Model</th>
                  <th className="px-4 py-2.5 font-medium">Version</th>
                  <th className="px-4 py-2.5 font-medium">Precision after review</th>
                  <th className="px-4 py-2.5 text-right font-medium">Feedback records</th>
                  <th className="px-4 py-2.5 font-medium">Last calibrated</th>
                </tr>
              </thead>
              <tbody>
                {SIGNAL_MODELS.map((model) => (
                  <tr key={model.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <div className="text-ink">{model.name}</div>
                      <div className="text-xs text-ink-3">{model.note}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-2">v{model.version}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Meter value={model.precision} tone={model.precision >= 65 ? "ok" : "warn"} className="w-28" label={`${model.name} precision`} />
                        <span className="tabular text-xs text-ink-2">{model.precision}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular text-ink-2">{model.feedback}</td>
                    <td className="whitespace-nowrap px-4 py-3 tabular text-ink-3">{model.calibrated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {tab === "users" && (
        <div className="space-y-6">
          <div className="flex items-start gap-3 rounded-md border border-accent/30 bg-accent/[0.06] p-4 text-[13px] leading-relaxed text-ink">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent-ink" />
            <p>
              <strong className="font-semibold">Separation of duties.</strong> Administrators manage data sources and user access. They cannot change investigation outcomes, priorities, notes or case status — those belong to investigators, and every change is written to the audit log.
            </p>
          </div>
          <Panel>
            <PanelHeader title="Users" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[13px]">
                <thead className="border-b border-line text-[11px] uppercase tracking-[0.08em] text-ink-3">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Name</th>
                    <th className="px-4 py-2.5 font-medium">Role</th>
                    <th className="px-4 py-2.5 font-medium">Access</th>
                    <th className="px-4 py-2.5 font-medium">Last active</th>
                  </tr>
                </thead>
                <tbody>
                  {PLATFORM_USERS.map((user) => (
                    <tr key={user.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-2.5 text-ink">{user.name}</td>
                      <td className="px-4 py-2.5 text-ink-2">{user.role}</td>
                      <td className="px-4 py-2.5 text-ink-3">{user.access}</td>
                      <td className="px-4 py-2.5 text-ink-3">{user.lastActive}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel>
            <PanelHeader title="Role permissions" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[13px]">
                <thead className="border-b border-line text-[11px] uppercase tracking-[0.08em] text-ink-3">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Permission</th>
                    <th className="px-4 py-2.5 text-center font-medium">Investigator</th>
                    <th className="px-4 py-2.5 text-center font-medium">Lead</th>
                    <th className="px-4 py-2.5 text-center font-medium">Analyst</th>
                    <th className="px-4 py-2.5 text-center font-medium">Administrator</th>
                  </tr>
                </thead>
                <tbody>
                  {ROLE_PERMISSIONS.map((row) => (
                    <tr key={row.permission} className="border-b border-line last:border-0">
                      <td className="px-4 py-2.5 text-ink">{row.permission}</td>
                      {[row.investigator, row.lead, row.analyst, row.admin].map((allowed, index) => (
                        <td key={index} className="px-4 py-2.5 text-center">
                          {allowed ? (
                            <Check className="mx-auto h-4 w-4 text-ok-ink" aria-label="Allowed" />
                          ) : (
                            <Lock className="mx-auto h-3.5 w-3.5 text-ink-3" aria-label="Not allowed" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {tab === "audit" && <AuditLog />}

      {tab === "preferences" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Panel>
            <PanelHeader title="Interface" />
            <PanelBody className="space-y-5">
              <Switch
                checked={prefs.reducedMotion}
                onChange={(v) => setPref("reducedMotion", v)}
                label="Reduce motion"
                description="Turns off counters, chart reveals and transitions. Your system setting is respected either way."
              />
              <Switch checked={prefs.sidebarCollapsed} onChange={(v) => setPref("sidebarCollapsed", v)} label="Compact sidebar" description="Show navigation icons only on large screens." />
            </PanelBody>
          </Panel>
          <Panel>
            <PanelHeader title="Demo workspace" />
            <PanelBody className="space-y-4">
              <p className="text-[13px] leading-relaxed text-ink-2">
                Case statuses, notes, context adjustments, feedback, saved items, AI conversations and imports persist in this browser&apos;s local storage under <span className="font-mono text-xs">aegis-procure-workspace</span>. Resetting returns every case to its demo starting point.
              </p>
              <Button variant="danger" onClick={() => setConfirm(true)}>
                <RotateCcw className="h-4 w-4" /> Reset demo workspace
              </Button>
              {done && <p className="text-[13px] text-ok-ink">Workspace reset. Every case is back at its starting point.</p>}
            </PanelBody>
          </Panel>
        </div>
      )}

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Reset demo workspace?"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>
              Keep my changes
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                resetDemo();
                setConfirm(false);
                setDone(true);
              }}
            >
              Reset workspace
            </Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-ink-2">This clears investigator changes stored in this browser. The synthetic dataset itself is not affected.</p>
      </Modal>
    </div>
  );
}
