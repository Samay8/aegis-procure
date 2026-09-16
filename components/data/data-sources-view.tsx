"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Check, CircleAlert, CircleCheck, Database, FileSpreadsheet, FileUp, LoaderCircle, RefreshCw, TriangleAlert, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DATA_QUALITY, DATA_SOURCES } from "@/data/platform";
import { formatDateTime, formatNumber, nowIST } from "@/lib/format";
import { ImportError, REQUIRED_FIELDS, analyseImport, previewImport, sampleCSV, type ImportPreview } from "@/lib/importer";
import { cn, uid } from "@/lib/utils";
import { useAegis } from "@/store/aegis";
import type { AnomalySignal } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Meter } from "@/components/ui/misc";
import { PageHeader, Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { EmptyState, ErrorState } from "@/components/ui/states";

const PIPELINE = ["Ingesting data", "Normalizing records", "Comparing procurement", "Mapping relationships", "Scoring signals", "Generating investigation queue"];

type Stage =
  | { kind: "idle" }
  | { kind: "reading"; fileName: string }
  | { kind: "preview"; preview: ImportPreview }
  | { kind: "analyzing"; preview: ImportPreview; step: number }
  | { kind: "done"; preview: ImportPreview; signals: AnomalySignal[] }
  | { kind: "error"; message: string; raw: string; fileName: string };

function SourceCard({ source }: { source: (typeof DATA_SOURCES)[number] }) {
  const [syncing, setSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(source.lastUpdated);
  const pushNotification = useAegis((s) => s.pushNotification);
  const log = useAegis((s) => s.log);

  useEffect(() => {
    if (!syncing) return;
    const timer = window.setTimeout(() => {
      setSyncing(false);
      setLastUpdated(nowIST());
      pushNotification({ kind: "DATA", title: "Data source updated", body: `${source.name} synced · ${formatNumber(source.records)} ${source.unit}`, href: "/data-sources" });
      log({ action: "Data source synced", target: source.name, actor: "Connector", actorKind: "SYSTEM" });
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [syncing, source, pushNotification, log]);

  const status = syncing ? "SYNCING" : source.status;
  return (
    <div className="flex flex-col rounded-md border border-line bg-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="type-label !text-ink-2">{source.name}</div>
        {status === "CONNECTED" ? (
          <Badge tone="ok">
            <Check className="h-3 w-3" /> Connected
          </Badge>
        ) : (
          <Badge tone="warn">
            <LoaderCircle className="h-3 w-3 animate-spin" /> Syncing
          </Badge>
        )}
      </div>
      <div className="type-title mt-3 text-3xl tabular text-ink">{formatNumber(source.records)}</div>
      <div className="text-xs text-ink-3">{source.unit}</div>
      <p className="mt-3 flex-1 text-[13px] leading-snug text-ink-2">{source.description}</p>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3 text-xs text-ink-3">
        <span>
          Updated <span className="tabular text-ink-2">{formatDateTime(lastUpdated)}</span>
          <span className="block">{source.coverage}</span>
        </span>
        <Button size="xs" variant="ghost" onClick={() => setSyncing(true)} disabled={syncing} aria-label={`Sync ${source.name}`}>
          <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} /> Sync
        </Button>
      </div>
    </div>
  );
}

function ImportPanel() {
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const addImport = useAegis((s) => s.addImport);

  const load = (fileName: string, text: string) => {
    try {
      const preview = previewImport(fileName, text);
      setStage({ kind: "preview", preview });
    } catch (error) {
      const raw = error instanceof ImportError ? error.raw : text.slice(0, 2000);
      setStage({ kind: "error", message: error instanceof Error ? error.message : "The file could not be read.", raw, fileName });
    }
  };

  const readFile = async (file: File) => {
    setStage({ kind: "reading", fileName: file.name });
    if (file.size > 5_000_000) {
      setStage({ kind: "error", message: "The file is larger than 5 MB. Split it into smaller imports.", raw: "", fileName: file.name });
      return;
    }
    const text = await file.text();
    load(file.name, text);
  };

  useEffect(() => {
    if (stage.kind !== "analyzing") return;
    if (stage.step >= PIPELINE.length) {
      const importId = uid("IMP");
      const signals = analyseImport(stage.preview, importId);
      addImport(
        {
          id: importId,
          fileName: stage.preview.fileName,
          format: stage.preview.format,
          rows: stage.preview.rows.length,
          columns: stage.preview.columns,
          issues: stage.preview.issues.map((i) => i.message),
          importedAt: nowIST(),
          signalsGenerated: signals.length,
          status: "ANALYZED",
        },
        signals,
      );
      setStage({ kind: "done", preview: stage.preview, signals });
      return;
    }
    const timer = window.setTimeout(() => setStage({ ...stage, step: stage.step + 1 }), 650);
    return () => window.clearTimeout(timer);
  }, [stage, addImport]);

  return (
    <Panel>
      <PanelHeader title="Import procurement data" description="CSV or JSON. Imported records are checked for data issues, then analyzed for price and bidding signals." icon={<Upload className="h-3.5 w-3.5" />} />
      <PanelBody className="space-y-5">
        {(stage.kind === "idle" || stage.kind === "reading") && (
          <>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) void readFile(file);
              }}
              className={cn(
                "flex flex-col items-center justify-center rounded-md border border-dashed px-6 py-10 text-center transition-colors",
                dragging ? "border-accent bg-accent/[0.06]" : "border-line-strong bg-panel-2/40",
              )}
            >
              {stage.kind === "reading" ? (
                <LoaderCircle className="h-7 w-7 animate-spin text-accent-ink" />
              ) : (
                <FileUp className="h-7 w-7 text-ink-3" />
              )}
              <p className="mt-3 text-[14px] text-ink">{stage.kind === "reading" ? `Reading ${stage.fileName}…` : "Drop a CSV or JSON file here"}</p>
              <p className="mt-1 text-xs text-ink-3">Up to 5 MB · one row per bid</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button variant="primary" size="sm" onClick={() => inputRef.current?.click()}>
                  Choose file
                </Button>
                <Button size="sm" onClick={() => load("sample-procurement-import.csv", sampleCSV())}>
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Use sample file
                </Button>
                <Button size="sm" variant="ghost" onClick={() => load("malformed-export.json", '[{"tender_id": "IMP-1", "vendor_id": "VX-1",}')}>
                  Try a malformed file
                </Button>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.json,text/csv,application/json"
                className="sr-only"
                aria-label="Choose a procurement data file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void readFile(file);
                  e.target.value = "";
                }}
              />
            </div>
            <div>
              <div className="type-label mb-2">Expected fields</div>
              <div className="flex flex-wrap gap-1.5">
                {REQUIRED_FIELDS.map((field) => (
                  <Badge key={field.key} tone="neutral" className="normal-case tracking-normal">
                    {field.label}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {stage.kind === "error" && (
          <ErrorState
            title="Data import failed"
            description={
              <>
                <span className="font-mono text-xs">{stage.fileName}</span> — {stage.message}
              </>
            }
            onRetry={() => setStage({ kind: "idle" })}
            raw={stage.raw}
          />
        )}

        {stage.kind === "preview" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.08em] text-ink-3">File</div>
                <div className="mt-1 truncate font-mono text-[13px] text-ink">{stage.preview.fileName}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.08em] text-ink-3">Records detected</div>
                <div className="type-title mt-1 text-2xl tabular text-ink">{stage.preview.rows.length}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.08em] text-ink-3">Columns detected</div>
                <div className="type-title mt-1 text-2xl tabular text-ink">{stage.preview.columns.length}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.08em] text-ink-3">Tenders</div>
                <div className="type-title mt-1 text-2xl tabular text-ink">{stage.preview.tenders}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {REQUIRED_FIELDS.map((field) => {
                const present = stage.preview.columns.includes(field.key);
                return (
                  <Badge key={field.key} tone={present ? "ok" : "risk"} className="normal-case tracking-normal">
                    {present ? <Check className="h-3 w-3" /> : <CircleAlert className="h-3 w-3" />} {field.label}
                  </Badge>
                );
              })}
            </div>

            <div>
              <div className="type-label mb-2">Potential issues</div>
              {stage.preview.issues.length ? (
                <ul className="space-y-1.5">
                  {stage.preview.issues.map((issue) => (
                    <li key={issue.message} className={cn("flex items-start gap-2 text-[13px]", issue.level === "error" ? "text-risk-ink" : "text-warn-ink")}>
                      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {issue.message}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="flex items-center gap-2 text-[13px] text-ok-ink">
                  <CircleCheck className="h-3.5 w-3.5" /> No issues detected.
                </p>
              )}
            </div>

            <div>
              <div className="type-label mb-2">Import preview</div>
              <div className="overflow-x-auto rounded-[5px] border border-line">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead className="bg-panel-2 text-ink-3">
                    <tr>
                      {stage.preview.columns.map((column) => (
                        <th key={column} className="px-2.5 py-2 font-medium">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stage.preview.rows.slice(0, 8).map((row, index) => (
                      <tr key={index} className="border-t border-line">
                        {stage.preview.columns.map((column) => (
                          <td key={column} className={cn("whitespace-nowrap px-2.5 py-1.5 tabular", row[column] ? "text-ink-2" : "bg-warn/10 text-warn-ink")}>
                            {row[column] || "missing"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                className="uppercase tracking-[0.05em]"
                disabled={stage.preview.missingColumns.length > 0}
                onClick={() => setStage({ kind: "analyzing", preview: stage.preview, step: 0 })}
              >
                Run anomaly analysis
              </Button>
              <Button variant="ghost" onClick={() => setStage({ kind: "idle" })}>
                Choose a different file
              </Button>
            </div>
            {stage.preview.missingColumns.length > 0 && <p className="text-xs text-risk-ink">Add the missing columns before running the analysis.</p>}
          </div>
        )}

        {stage.kind === "analyzing" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-ink">Analyzing {stage.preview.rows.length} records</span>
              <span className="tabular text-ink-3">{Math.round((stage.step / PIPELINE.length) * 100)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-panel-3">
              <motion.div className="h-full bg-accent" animate={{ width: `${(stage.step / PIPELINE.length) * 100}%` }} transition={{ duration: 0.5 }} />
            </div>
            <ol className="space-y-0">
              {PIPELINE.map((step, index) => {
                const done = index < stage.step;
                const active = index === stage.step;
                return (
                  <li key={step} className="flex flex-col items-start">
                    <div className={cn("flex items-center gap-3 rounded-[4px] px-3 py-2 text-[13px] font-semibold uppercase tracking-[0.06em]", done ? "text-ok-ink" : active ? "bg-accent/10 text-ink" : "text-ink-3")}>
                      {done ? <Check className="h-4 w-4" /> : active ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <span className="h-4 w-4 rounded-full border border-line-strong" />}
                      {step}
                    </div>
                    {index < PIPELINE.length - 1 && <span className="ml-[1.35rem] h-3 w-px bg-line-strong" aria-hidden />}
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {stage.kind === "done" && (
          <AnimatePresence>
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-start gap-3 rounded-md border border-ok/30 bg-ok/[0.06] p-4">
                <CircleCheck className="mt-0.5 h-5 w-5 text-ok-ink" />
                <div>
                  <div className="text-[14px] font-medium text-ink">Analysis complete</div>
                  <p className="mt-0.5 text-[13px] text-ink-2">
                    {stage.preview.rows.length} records ingested from {stage.preview.fileName}. {stage.signals.length} new {stage.signals.length === 1 ? "signal" : "signals"} added to the signal center for review.
                  </p>
                </div>
              </div>
              {stage.signals.length > 0 && (
                <ul className="divide-y divide-line rounded-md border border-line">
                  {stage.signals.map((signal) => (
                    <li key={signal.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                      <div>
                        <div className="text-[13px] font-medium text-ink">{signal.title}</div>
                        <div className="text-xs text-ink-3">{signal.headline}</div>
                      </div>
                      <Badge tone={signal.severity === "HIGH" ? "risk" : "warn"}>{signal.severity.toLowerCase()}</Badge>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-2">
                <ButtonLink href="/alerts" variant="primary" size="sm">
                  Review in signal center <ArrowUpRight className="h-3.5 w-3.5" />
                </ButtonLink>
                <Button size="sm" variant="ghost" onClick={() => setStage({ kind: "idle" })}>
                  Import another file
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </PanelBody>
    </Panel>
  );
}

export function DataSourcesView() {
  const imports = useAegis((s) => s.imports);

  return (
    <div className="space-y-6">
      <PageHeader
        meta={
          <>
            <Database className="h-3.5 w-3.5" /> {DATA_SOURCES.length} connected sources
          </>
        }
        title="Data sources"
        description="Where the evidence comes from, how fresh it is, and how clean it is. Signals are only as good as the records behind them."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {DATA_SOURCES.map((source) => (
          <SourceCard key={source.id} source={source} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <ImportPanel />

        <Panel>
          <PanelHeader title="Data quality" description={`${formatNumber(DATA_QUALITY.recordsAnalyzed)} records analyzed`} />
          <PanelBody className="space-y-5">
            <div className="flex items-end gap-4">
              <div className="type-display text-6xl tabular text-ink">{DATA_QUALITY.score}%</div>
              <div className="mb-2 flex-1">
                <Meter value={DATA_QUALITY.score} tone="ok" label="Data quality score" />
                <div className="mt-1.5 text-xs text-ink-3">Composite of completeness, uniqueness, identity resolution and consistency</div>
              </div>
            </div>
            <ul className="divide-y divide-line border-t border-line">
              {DATA_QUALITY.checks.map((check) => (
                <li key={check.id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-[13px] font-medium text-ink">
                      {check.status === "OK" ? <CircleCheck className="h-4 w-4 text-ok-ink" /> : <TriangleAlert className="h-4 w-4 text-warn-ink" />}
                      {check.label}
                    </span>
                    <span className="tabular text-[13px] text-ink-2">{check.value}</span>
                  </div>
                  <p className="mt-1 text-[13px] leading-snug text-ink-2">{check.detail}</p>
                  <p className="mt-0.5 text-xs leading-snug text-ink-3">Impact: {check.impact}</p>
                </li>
              ))}
            </ul>
          </PanelBody>
        </Panel>
      </div>

      <Panel>
        <PanelHeader title="Import history" />
        {imports.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead className="border-b border-line text-[11px] uppercase tracking-[0.08em] text-ink-3">
                <tr>
                  <th className="px-4 py-2.5 font-medium">File</th>
                  <th className="px-4 py-2.5 font-medium">Imported</th>
                  <th className="px-4 py-2.5 text-right font-medium">Rows</th>
                  <th className="px-4 py-2.5 text-right font-medium">Issues</th>
                  <th className="px-4 py-2.5 text-right font-medium">Signals</th>
                </tr>
              </thead>
              <tbody>
                {imports.map((record) => (
                  <tr key={record.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs text-ink">{record.fileName}</td>
                    <td className="px-4 py-2.5 tabular text-ink-3">{formatDateTime(record.importedAt)}</td>
                    <td className="px-4 py-2.5 text-right tabular text-ink-2">{record.rows}</td>
                    <td className="px-4 py-2.5 text-right tabular text-ink-2">{record.issues.length}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Link href="/alerts" className="tabular text-accent-ink hover:underline">
                        {record.signalsGenerated}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Upload} title="No uploaded data" description="Imports you run in this browser are listed here with the signals they produced." className="py-10" />
        )}
      </Panel>
    </div>
  );
}
