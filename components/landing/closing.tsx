"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { LogoMark } from "@/components/layout/logo";
import { SYNTHETIC_NOTICE } from "@/data/reference";

export function ClosingStatement() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ground bg-grid px-6 py-20 text-center">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_55%_55%_at_50%_50%,rgba(77,142,247,0.09),transparent_70%)]" />
      <div className="relative max-w-5xl">
        <motion.h1
          className="type-display text-[32px] uppercase leading-[0.95] text-ink sm:text-[56px] lg:text-[80px]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          The system doesn&apos;t decide who is guilty.
        </motion.h1>
        <motion.p
          className="type-display mt-8 text-[28px] uppercase leading-[0.95] text-ink-2 sm:text-[44px] lg:text-[54px]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          It shows investigators where to look.
        </motion.p>
        <motion.div
          className="mt-16 flex flex-col items-center gap-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 2 }}
        >
          <LogoMark className="h-12 w-12" />
          <p className="type-title text-lg uppercase tracking-[0.2em] text-ink-3 sm:text-xl">
            See the signal.
            <span className="block">Follow the evidence.</span>
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/overview" variant="secondary">
              <ArrowLeft className="h-4 w-4" /> Back to the investigation center
            </ButtonLink>
            <ButtonLink href="/" variant="ghost">
              AEGIS PROCURE home
            </ButtonLink>
          </div>
          <p className="mt-8 text-[11px] text-ink-3">{SYNTHETIC_NOTICE}</p>
        </motion.div>
      </div>
    </main>
  );
}
