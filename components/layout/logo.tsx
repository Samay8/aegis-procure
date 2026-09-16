import { cn } from "@/lib/utils";

/** The mark: a protective hexagon crossed by a signal trace with one anomaly peak. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("h-7 w-7", className)} fill="none">
      <path d="M16 2.5 27.5 9v14L16 29.5 4.5 23V9L16 2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" className="text-ink" />
      <path
        d="M7.5 17.5h4l1.8-3.2 2.4 7.2 2.6-11 2.3 7h3.9"
        stroke="#4d8ef7"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18.3" cy="10.5" r="1.9" fill="#e5564c" />
    </svg>
  );
}

export function Wordmark({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-[15px] font-extrabold tracking-[0.14em] text-ink [font-stretch:125%]">AEGIS</span>
          <span className="mt-[3px] text-[9.5px] font-semibold tracking-[0.42em] text-ink-3 [font-stretch:125%]">PROCURE</span>
        </span>
      )}
    </span>
  );
}
