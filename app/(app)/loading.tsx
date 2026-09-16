import { LoaderCircle } from "lucide-react";

export default function AppLoading() {
  return (
    <div className="space-y-4 py-2" role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-[13px] text-ink-3">
        <LoaderCircle className="h-4 w-4 animate-spin text-accent-ink" />
        Analyzing procurement records…
      </div>
      <div className="skeleton h-10 w-2/3 rounded-md" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="skeleton h-28 rounded-md" />
        <div className="skeleton h-28 rounded-md" />
        <div className="skeleton h-28 rounded-md" />
      </div>
      <div className="skeleton h-72 rounded-md" />
    </div>
  );
}
