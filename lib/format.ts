/**
 * Locale-independent formatting so server and client render identical strings.
 * All dates are IST wall-clock strings ("YYYY-MM-DD" / "YYYY-MM-DDTHH:mm").
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CRORE = 10_000_000;
const LAKH = 100_000;

function group(int: string) {
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatNumber(value: number, digits = 0) {
  const fixed = Math.abs(value).toFixed(digits);
  const [int, dec] = fixed.split(".");
  const sign = value < 0 ? "-" : "";
  return `${sign}${group(int)}${dec ? `.${dec}` : ""}`;
}

/** ₹8.42 Cr · ₹84.2 L · ₹84,200 */
export function formatINR(value: number, digits?: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= CRORE) return `${sign}₹${(abs / CRORE).toFixed(digits ?? 2)} Cr`;
  if (abs >= LAKH) return `${sign}₹${(abs / LAKH).toFixed(digits ?? 1)} L`;
  return `${sign}₹${formatNumber(abs)}`;
}

export function formatCr(value: number, digits = 2) {
  return `₹${(value / CRORE).toFixed(digits)} Cr`;
}

export function toCr(value: number) {
  return value / CRORE;
}

export function formatPct(value: number, digits = 1, signed = false) {
  const s = `${Math.abs(value).toFixed(digits)}%`;
  if (!signed) return value < 0 ? `-${s}` : s;
  return value > 0 ? `+${s}` : value < 0 ? `−${s}` : s;
}

export function formatSigned(value: number) {
  return value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : "0";
}

interface Parts {
  y: number;
  m: number;
  d: number;
  hh: number;
  mm: number;
}

export function parseParts(iso: string): Parts {
  const [date, time = "00:00"] = iso.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return { y, m, d, hh: hh || 0, mm: mm || 0 };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function formatDate(iso: string) {
  const { y, m, d } = parseParts(iso);
  return `${pad(d)} ${MONTHS[m - 1]} ${y}`;
}

export function formatDateShort(iso: string) {
  const { m, d } = parseParts(iso);
  return `${pad(d)} ${MONTHS[m - 1]}`;
}

export function formatMonth(iso: string) {
  const { y, m } = parseParts(iso);
  return `${MONTHS[m - 1]} ${y}`;
}

export function formatMonthShort(iso: string) {
  const { y, m } = parseParts(iso);
  return `${MONTHS[m - 1]} ’${String(y).slice(2)}`;
}

export function formatTime(iso: string) {
  const { hh, mm } = parseParts(iso);
  return `${pad(hh)}:${pad(mm)}`;
}

export function formatDateTime(iso: string) {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

/** Day number since epoch for an IST wall-clock string (timezone-free arithmetic). */
export function dayNumber(iso: string) {
  const { y, m, d } = parseParts(iso);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

export function minuteNumber(iso: string) {
  const { y, m, d, hh, mm } = parseParts(iso);
  return Math.floor(Date.UTC(y, m - 1, d, hh, mm) / 60_000);
}

export function daysBetween(a: string, b: string) {
  return dayNumber(b) - dayNumber(a);
}

export function addDays(iso: string, days: number) {
  const { y, m, d } = parseParts(iso);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function withTime(date: string, hh: number, mm: number) {
  return `${date}T${pad(hh)}:${pad(mm)}`;
}

export function monthKey(iso: string) {
  return iso.slice(0, 7);
}

/** Current IST wall-clock timestamp, used for investigator actions. */
export function nowIST() {
  const shifted = new Date(Date.now() + 5.5 * 3_600_000);
  return shifted.toISOString().slice(0, 16);
}

export function relativeTime(iso: string, nowIso: string) {
  const diff = minuteNumber(nowIso) - minuteNumber(iso);
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff} min ago`;
  const hours = Math.floor(diff / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return formatDate(iso);
}
