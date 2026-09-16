import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sum(values: number[]) {
  return values.reduce((s, v) => s + v, 0);
}

export function mean(values: number[]) {
  return values.length ? sum(values) / values.length : 0;
}

/** Percentile with linear interpolation (same as spreadsheet PERCENTILE.INC). */
export function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function median(values: number[]) {
  return percentile(values, 0.5);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function groupBy<T, K extends string>(items: T[], key: (item: T) => K) {
  const out = {} as Record<K, T[]>;
  for (const item of items) {
    const k = key(item);
    (out[k] ||= []).push(item);
  }
  return out;
}

export function countBy<T, K extends string>(items: T[], key: (item: T) => K) {
  const out = {} as Record<K, number>;
  for (const item of items) {
    const k = key(item);
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count.toLocaleString("en-US")} ${count === 1 ? singular : plural}`;
}
