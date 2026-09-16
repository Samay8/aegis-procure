"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Eye, FileSearch, Scale, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { PLATFORM, SIGNAL_CATEGORY_COUNTS } from "@/data/analytics";
import { CASE_BY_ID } from "@/data/cases";
import { SIGNAL_CATEGORY_META, SYNTHETIC_NOTICE } from "@/data/reference";
import { CASE_STATS, CASE_SPREAD } from "@/data/signals";
import { CLUSTER_VENDORS, PRIMARY_CASE } from "@/data/story";
import { formatCr, formatPct } from "@/lib/format";
import { getNetwork } from "@/lib/network";
import { scoreCase } from "@/lib/scoring";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { ButtonLink } from "@/components/ui/button";
import { LogoMark, Wordmark } from "@/components/layout/logo";
import { AnomalyRadar } from "@/components/charts/radar";
import { CHART } from "@/components/charts/theme";
import { NetworkGraphView } from "@/components/network/network-graph";
import { HeroNetwork } from "./hero-network";
import { SignalField } from "./signal-field";

const primary = CASE_BY_ID.get(PRIMARY_CASE)!;
const baseScore = scoreCase(primary);
const contextScore = scoreCase(primary, { appliedContext: ["CTX-0042-PRICE"] });
const priceContext = primary.contextChecks.find((c) => c.id === "CTX-0042-PRICE")!;

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="type-label mb-5 !text-ink-3">{children}</div>;
}

function ContextLedger() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -20% 0px" });
  const rows = [
    { label: "Winning price against comparable median", value: formatPct(CASE_STATS.deviationPct, 1, true), tone: "text-ink" },
    ...priceContext.adjustments.map((a) => ({ label: a.label, value: formatPct(a.effect, 1, true), tone: "text-ok-ink" })),
  ];
  return (
    <div ref={ref} className="rounded-md border border-line bg-panel p-5 sm:p-7">
      <div className="type-label !text-ink-2">Price signal · context check</div>
      <ul className="mt-5 space-y-0">
        {rows.map((row, index) => (
          <motion.li
            key={row.label}
            initial={{ opacity: 0, x: -8 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.15 + index * 0.35, duration: 0.35 }}
            className="flex items-baseline justify-between gap-4 border-b border-line py-3"
          >
            <span className="text-[14px] text-ink-2">{index > 0 ? "− " : ""}{row.label}</span>
            <span className={`type-title text-2xl tabular ${row.tone}`}>{row.value}</span>
          </motion.li>
        ))}
        <motion.li
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 1.35, duration: 0.4 }}
          className="flex items-baseline justify-between gap-4 pt-4"
        >
          <span className="text-[14px] font-medium text-ink">= Adjusted deviation</span>
          <span className="type-display text-4xl tabular text-ok-ink">{formatPct(priceContext.adjustedValue, 1, true)}</span>
        </motion.li>
      </ul>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 1.8, duration: 0.45 }}
        className="mt-7 flex flex-wrap items-center gap-5 rounded-[5px] border border-ok/30 bg-ok/[0.06] p-4"
      >
        <div>
          <div className="text-[11px] uppercase tracking-[0.08em] text-ink-3">Original priority</div>
          <div className="type-display text-5xl tabular text-ink-2">{baseScore.total}</div>
        </div>
        <ArrowRight className="h-6 w-6 text-ink-3" />
        <div>
          <div className="text-[11px] uppercase tracking-[0.08em] text-ink-3">After context</div>
          <div className="type-display text-5xl tabular text-ok-ink">{inView ? <AnimatedNumber value={contextScore.total} startOnView={false} duration={1.4} /> : baseScore.total}</div>
        </div>
        <p className="min-w-[12rem] flex-1 text-[13px] leading-relaxed text-ink-2">
          Lowered priority after context. The shared address and the participation pattern are untouched — they still require review.
        </p>
      </motion.div>
    </div>
  );
}

export function Landing() {
  const graph = useMemo(() => getNetwork(), []);
  const [selected, setSelected] = useState<string | null>(null);
  const clusterIds = useMemo(() => {
    const ids = new Set<string>(CLUSTER_VENDORS);
    for (const edge of graph.edges) {
      if (edge.type === "ISSUED_BY" || edge.type === "BID" || edge.type === "AWARD") continue;
      if (CLUSTER_VENDORS.includes(edge.source)) ids.add(edge.target);
      if (CLUSTER_VENDORS.includes(edge.target)) ids.add(edge.source);
    }
    return ids;
  }, [graph]);

  return (
    <div className="min-h-screen bg-ground">
      {/* Navigation */}
      <header className="sticky top-0 z-30 border-b border-line bg-ground/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-6 px-4 sm:px-8">
          <Link href="/" aria-label="AEGIS PROCURE home">
            <Wordmark />
          </Link>
          <nav aria-label="Sections" className="hidden items-center gap-6 text-[13px] text-ink-2 lg:flex">
            <a href="#signal" className="hover:text-ink">The challenge</a>
            <a href="#radar" className="hover:text-ink">Anomaly radar</a>
            <a href="#relationships" className="hover:text-ink">Relationships</a>
            <a href="#context" className="hover:text-ink">Context</a>
            <a href="#responsible-ai" className="hover:text-ink">Responsible AI</a>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-ink-3 md:inline">Synthetic demo data</span>
            <ButtonLink href="/overview" variant="primary" size="sm">
              Open investigation center
            </ButtonLink>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line bg-grid">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_78%_40%,rgba(77,142,247,0.10),transparent_70%)]" />
        <div className="relative mx-auto grid grid-cols-1 max-w-[1320px] gap-10 px-4 pb-14 pt-14 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:pb-20 lg:pt-20">
          <div className="flex flex-col justify-center">
            <p className="text-[13px] text-ink-3">The investigative intelligence layer for public procurement</p>
            <h1 className="type-display mt-6 text-[42px] uppercase leading-[0.9] text-ink sm:text-[72px] xl:text-[92px]">
              <motion.span className="block" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
                See the signal.
              </motion.span>
              <motion.span className="block text-ink-2" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}>
                Follow the evidence.
              </motion.span>
            </h1>
            <p className="mt-7 max-w-xl text-[17px] leading-relaxed text-ink-2">
              An intelligent procurement audit platform that helps investigators detect unusual patterns, connect relationships, and prioritize the cases that deserve human attention.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/overview" variant="primary" size="lg" className="uppercase tracking-[0.06em]">
                Open investigation center <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink href="/procurement" variant="secondary" size="lg" className="uppercase tracking-[0.06em]">
                Explore procurement data
              </ButtonLink>
            </div>
          </div>
          <div className="relative rounded-md border border-line bg-panel/70 p-3 backdrop-blur-sm sm:p-5">
            <div className="mb-2 flex items-center justify-between text-xs text-ink-3">
              <span>Live procurement flow · coastal maintenance program</span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-risk" /> signal
              </span>
            </div>
            <HeroNetwork />
          </div>
        </div>

        <div className="relative border-t border-line bg-ground/60">
          <dl className="mx-auto grid max-w-[1320px] grid-cols-2 gap-x-6 gap-y-6 px-4 py-8 sm:px-8 md:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Events analyzed", value: <AnimatedNumber value={PLATFORM.events} /> },
              { label: "Procurement value", value: <AnimatedNumber value={PLATFORM.value / 1e7} format={(n) => `₹${n.toFixed(1)} Cr`} /> },
              { label: "Vendors", value: <AnimatedNumber value={PLATFORM.vendors} /> },
              { label: "Contracts", value: <AnimatedNumber value={PLATFORM.contracts} /> },
              { label: "Priority signals", value: <AnimatedNumber value={PLATFORM.signals} />, tone: "text-risk-ink" },
              { label: "Active investigations", value: <AnimatedNumber value={PLATFORM.activeInvestigations} />, tone: "text-accent-ink" },
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-3">{item.label}</dt>
                <dd className={`type-title mt-1.5 text-[28px] ${item.tone ?? "text-ink"}`}>{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* The challenge */}
      <section id="signal" className="scroll-mt-16 border-b border-line">
        <div className="mx-auto max-w-[1320px] px-4 py-20 sm:px-8 lg:py-28">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div>
              <Eyebrow>The challenge</Eyebrow>
              <h2 className="type-display text-[30px] uppercase leading-[0.95] text-ink sm:text-[44px] lg:text-[56px]">
                Procurement data is full of signals.
              </h2>
              <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-ink-2">
                The challenge is finding the ones that matter. Most transactions are legitimate, and in specialized markets normal behavior can look unusual.
              </p>
              <p className="type-title mt-10 text-2xl uppercase leading-tight text-ink">
                The signal is there.
                <span className="block text-ink-3">The question is: can you find it?</span>
              </p>
            </div>
            <div className="rounded-md border border-line bg-panel p-5 sm:p-6">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <span className="type-label !text-ink-2">{PLATFORM.tenders} tenders · {PLATFORM.events.toLocaleString("en-US")} events</span>
                <span className="text-xs text-ink-3">{PLATFORM.signals} signals</span>
              </div>
              <SignalField />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-line bg-panel/40">
        <div className="mx-auto max-w-[1320px] px-4 py-20 sm:px-8">
          <h2 className="type-display max-w-4xl text-[27px] uppercase leading-[0.98] text-ink sm:text-[38px] lg:text-[46px]">
            AEGIS PROCURE turns procurement records into explainable investigation priorities.
          </h2>
          <ol className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "Data", icon: FileSearch, text: "Tenders, bids, vendors, contracts and payments are resolved into one record of each procurement." },
              { step: "Signal", icon: Eye, text: "Price, bidding, award, relationship, timing and payment patterns are measured against comparable procurements." },
              { step: "Evidence", icon: ShieldCheck, text: "Every signal carries its records, its context and the legitimate explanations still to be tested." },
              { step: "Investigation", icon: UserRound, text: "Investigators review, add context, record notes and decide the outcome. The system only ranks." },
            ].map((item, index) => (
              <li key={item.step} className="bg-ground p-6">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-ink-3">{String(index + 1).padStart(2, "0")}</span>
                  <item.icon className="h-5 w-5 text-accent-ink" />
                </div>
                <div className="type-title mt-8 text-xl uppercase text-ink">{item.step}</div>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{item.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Radar + equation */}
      <section id="radar" className="scroll-mt-16 border-b border-line">
        <div className="mx-auto grid grid-cols-1 max-w-[1320px] gap-12 px-4 py-20 sm:px-8 lg:grid-cols-2 lg:py-28">
          <div>
            <Eyebrow>Anomaly radar</Eyebrow>
            <h2 className="type-display text-[30px] uppercase leading-[0.95] text-ink sm:text-[44px] lg:text-[52px]">What looks unusual — and why.</h2>
            <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-ink-2">
              Eight categories of signal, each answering a different question. No single category decides anything; priority comes from independent layers of evidence agreeing.
            </p>
            <div className="mt-10 rounded-md border border-line bg-panel p-5">
              <div className="type-label !text-ink-2">{primary.id} · {primary.title}</div>
              <ol className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
                {baseScore.factors.slice(0, 4).map((factor, index) => (
                  <li key={factor.id} className="flex items-center gap-2">
                    {index > 0 && <span className="text-ink-3">+</span>}
                    <span className="flex items-center gap-2 rounded-[4px] border border-line-strong bg-panel-2 px-2.5 py-1.5">
                      <span className="h-2 w-2 rounded-[2px]" style={{ background: CHART.series[index] }} />
                      <span className="uppercase tracking-[0.04em] text-ink-2">{factor.label}</span>
                    </span>
                  </li>
                ))}
                <li className="flex items-center gap-2">
                  <span className="text-ink-3">+</span>
                  <span className="rounded-[4px] border border-dashed border-ok/50 px-2.5 py-1.5 uppercase tracking-[0.04em] text-ok-ink">Context</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-ink-3">=</span>
                  <span className="rounded-[4px] border border-risk/50 bg-risk/10 px-2.5 py-1.5 font-semibold uppercase tracking-[0.04em] text-risk-ink">
                    Priority {baseScore.total}
                  </span>
                </li>
              </ol>
              <p className="mt-4 text-[13px] leading-relaxed text-ink-3">
                Winning bid {formatPct(CASE_STATS.deviationPct, 1, true)} against {CASE_STATS.count} comparable procurements · all bids within {CASE_SPREAD.toFixed(2)}% · eight similar awards in fourteen months · shared registered address between two bidders.
              </p>
            </div>
          </div>
          <div className="rounded-md border border-line bg-panel p-4 sm:p-6">
            <AnomalyRadar data={SIGNAL_CATEGORY_COUNTS} size={440} />
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-ink-3 sm:grid-cols-4">
              {SIGNAL_CATEGORY_COUNTS.map((c) => (
                <li key={c.category} className="flex justify-between gap-2">
                  <span>{SIGNAL_CATEGORY_META[c.category].short}</span>
                  <span className="tabular text-ink-2">{c.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Relationships */}
      <section id="relationships" className="scroll-mt-16 border-b border-line bg-panel/40">
        <div className="mx-auto grid grid-cols-1 max-w-[1320px] gap-12 px-4 py-20 sm:px-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:py-28">
          <div className="order-2 lg:order-1">
            <NetworkGraphView graph={graph} filters={["all"]} restrictTo={clusterIds} selectedId={selected} onSelect={setSelected} height={460} />
          </div>
          <div className="order-1 lg:order-2">
            <Eyebrow>Relationship intelligence</Eyebrow>
            <h2 className="type-display text-[30px] uppercase leading-[0.95] text-ink sm:text-[44px] lg:text-[52px]">The anomaly is only the beginning.</h2>
            <p className="mt-6 text-[17px] leading-relaxed text-ink-2">
              Four bidders who declared themselves independent. Two share a registered address. Two share a director. All four met in nine packages, and the winner rotated in eight.
            </p>
            <dl className="mt-8 divide-y divide-line rounded-md border border-line bg-panel">
              {[
                ["Shared address", "Vertex Infra ↔ Northstar Roads · 100% match · 4 records"],
                ["Shared director", "Apex Civilworks ↔ BlueGrid Infrastructure · 4 records"],
                ["Joint participation", "9 packages · winners rotate in 8"],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[9rem_1fr]">
                  <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-rel-ink">{label}</dt>
                  <dd className="text-[13px] text-ink-2">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[13px] text-ink-3">Every link is an investigative lead that requires verification — not proof of wrongdoing.</p>
          </div>
        </div>
      </section>

      {/* Context */}
      <section id="context" className="scroll-mt-16 border-b border-line">
        <div className="mx-auto grid grid-cols-1 max-w-[1320px] gap-12 px-4 py-20 sm:px-8 lg:grid-cols-2 lg:py-28">
          <div>
            <Eyebrow>Contextual analysis</Eyebrow>
            <h2 className="type-display text-[30px] uppercase leading-[0.95] text-ink sm:text-[44px] lg:text-[52px]">It checks context before it raises its voice.</h2>
            <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-ink-2">
              A price 25.5% above the median looks alarming. Material costs rose 18% and coastal work carries a 5% regional factor. The system shows that arithmetic, and the investigator decides whether it applies.
            </p>
            <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-ink-3">
              Since context checks began running before alerts, the share of reviews closed as “explained by context” fell from 41% to 22%.
            </p>
          </div>
          <ContextLedger />
        </div>
      </section>

      {/* Workspace */}
      <section className="border-b border-line bg-panel/40">
        <div className="mx-auto max-w-[1320px] px-4 py-20 sm:px-8 lg:py-28">
          <Eyebrow>Investigation workspace</Eyebrow>
          <h2 className="type-display max-w-3xl text-[30px] uppercase leading-[0.95] text-ink sm:text-[44px] lg:text-[52px]">The investigator stays in control.</h2>
          <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-md border border-line bg-panel p-5">
              <div className="type-label !text-ink-2">Status</div>
              <ol className="mt-4 space-y-2">
                {["New", "Under review", "Evidence gathering", "Context check", "Referred", "Resolved"].map((status, index) => (
                  <li key={status} className={`flex items-center gap-3 rounded-[4px] border px-3 py-2 text-[13px] ${index === 1 ? "border-accent/50 bg-accent/10 text-ink" : "border-line text-ink-3"}`}>
                    <span className="font-mono text-[11px]">{String(index + 1).padStart(2, "0")}</span>
                    {status}
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-md border border-line bg-panel p-5">
              <div className="type-label !text-ink-2">Investigator notes</div>
              <div className="mt-4 rounded-[5px] border border-line bg-panel-2/60 p-3">
                <div className="text-[11px] text-ink-3">A. Rao · Senior Investigator</div>
                <p className="mt-1.5 text-[14px] leading-relaxed text-ink">Review vendor ownership records and historical joint participation.</p>
              </div>
              <div className="type-label mt-5 !text-ink-2">Signal feedback</div>
              <div className="mt-3 space-y-2 text-[13px]">
                <div className="flex items-center justify-between rounded-[4px] border border-line px-3 py-2">
                  <span className="text-ink-2">Price outlier</span>
                  <span className="rounded-[3px] bg-ok/15 px-1.5 text-[11px] font-semibold uppercase text-ok-ink">Explained by context</span>
                </div>
                <div className="flex items-center justify-between rounded-[4px] border border-line px-3 py-2">
                  <span className="text-ink-2">Shared address</span>
                  <span className="rounded-[3px] bg-accent/15 px-1.5 text-[11px] font-semibold uppercase text-accent-ink">Relevant</span>
                </div>
              </div>
            </div>
            <div className="rounded-md border border-line bg-panel p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-rel-ink" />
                <span className="type-label !text-ink-2">AI investigation assistant</span>
              </div>
              <p className="mt-4 rounded-[5px] border border-accent/25 bg-accent/[0.07] px-3 py-2 text-[13px] text-ink">Why is this case high priority?</p>
              <div className="mt-3 space-y-2 text-[13px] leading-relaxed text-ink-2">
                <p>Four independent signals contribute most to the score:</p>
                <ol className="list-decimal space-y-1 pl-5">
                  <li>The winning price is {CASE_STATS.deviationPct.toFixed(1)}% above the comparable median.</li>
                  <li>The same vendor won 8 similar contracts in 14 months.</li>
                  <li>All bids sit within {CASE_SPREAD.toFixed(2)}% of each other.</li>
                  <li>Two participating vendors share a registered address.</li>
                </ol>
                <p className="text-ink">These signals do not establish misconduct. They indicate areas that may warrant further review.</p>
              </div>
              <p className="mt-4 border-t border-line pt-3 text-[11px] text-ink-3">AI-generated analysis is decision support, not a finding of misconduct.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Responsible AI */}
      <section id="responsible-ai" className="scroll-mt-16 border-b border-line">
        <div className="mx-auto max-w-[1320px] px-4 py-20 sm:px-8 lg:py-28">
          <Eyebrow>Responsible AI</Eyebrow>
          <h2 className="type-display text-[34px] uppercase leading-[0.92] text-ink sm:text-[52px] lg:text-[64px]">
            AI that explains.
            <span className="block text-ink-3">Not AI that accuses.</span>
          </h2>
          <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-3">
            {[
              { title: "Evidence first", icon: FileSearch, text: "AI summarizes observed procurement evidence and cites the record behind every statement." },
              { title: "Human review", icon: UserRound, text: "Investigators make every decision. Status, priority and outcomes change only when a person changes them." },
              { title: "Explainable signals", icon: Scale, text: "Every score decomposes into named factors, and every factor traces to contributing evidence." },
            ].map((principle) => (
              <div key={principle.title} className="bg-ground p-7">
                <principle.icon className="h-5 w-5 text-accent-ink" />
                <div className="type-title mt-6 text-xl uppercase text-ink">{principle.title}</div>
                <p className="mt-3 text-[14px] leading-relaxed text-ink-2">{principle.text}</p>
              </div>
            ))}
          </div>
          <p className="type-title mt-14 max-w-4xl text-[22px] uppercase leading-tight text-ink sm:text-[32px]">
            AI can find patterns. <span className="text-ink-3">Only people can determine what they mean.</span>
          </p>
        </div>
      </section>

      {/* Closing */}
      <section className="relative overflow-hidden bg-grid">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_50%_100%,rgba(229,86,76,0.08),transparent_70%)]" />
        <div className="relative mx-auto max-w-[1320px] px-4 py-24 text-center sm:px-8 lg:py-36">
          <h2 className="type-display mx-auto max-w-5xl text-[30px] uppercase leading-[0.95] text-ink sm:text-[48px] lg:text-[62px]">
            The system doesn&apos;t decide who is guilty.
            <span className="mt-4 block text-ink-2">It shows investigators where to look.</span>
          </h2>
          <div className="mx-auto mt-12 flex max-w-md items-center justify-center gap-3">
            <LogoMark className="h-8 w-8" />
            <span className="type-title text-left text-sm uppercase tracking-[0.18em] text-ink-3">
              See the signal.
              <span className="block">Follow the evidence.</span>
            </span>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/overview" variant="primary" size="lg" className="uppercase tracking-[0.06em]">
              Open investigation center <ArrowRight className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink href={`/investigations/${PRIMARY_CASE}`} variant="secondary" size="lg" className="uppercase tracking-[0.06em]">
              Walk through case {PRIMARY_CASE.slice(-4)}
            </ButtonLink>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-4 py-8 text-xs text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>AEGIS PROCURE · Find the patterns. Prioritize the investigation.</span>
          <span>{SYNTHETIC_NOTICE} Contract value {formatCr(PLATFORM.value, 1)} is synthetic.</span>
        </div>
      </footer>
    </div>
  );
}
