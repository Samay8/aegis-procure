"use client";

import { animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { formatNumber } from "@/lib/format";

/** Counts toward a value once visible; re-animates from the previous value when it changes. */
export function AnimatedNumber({
  value,
  format = (n: number) => formatNumber(Math.round(n)),
  duration = 1.2,
  className,
  startOnView = true,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
  startOnView?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "0px 0px -8% 0px" });
  const previous = useRef<number | null>(null);
  const formatRef = useRef(format);
  const [initial] = useState(() => (startOnView ? 0 : value));

  useEffect(() => {
    formatRef.current = format;
  });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduce) {
      node.textContent = formatRef.current(value);
      previous.current = value;
      return;
    }
    if (startOnView && !inView) return;
    const from = previous.current ?? initial;
    if (from === value) {
      node.textContent = formatRef.current(value);
      previous.current = value;
      return;
    }
    const controls = animate(from, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        node.textContent = formatRef.current(latest);
      },
    });
    previous.current = value;
    return () => controls.stop();
  }, [value, inView, reduce, duration, startOnView, initial]);

  return (
    <span ref={ref} className={className}>
      {format(initial)}
    </span>
  );
}
