import Link from "next/link";
import { Wordmark } from "@/components/layout/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ground bg-grid px-6 text-center">
      <Wordmark />
      <p className="type-label mt-12">404 · record not found</p>
      <h1 className="type-display mt-4 max-w-2xl text-[40px] uppercase leading-[0.95] text-ink sm:text-[56px]">No signal at this address.</h1>
      <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-2">
        The page or record you asked for does not exist in this workspace. It may have been mistyped, or it belongs to data that was never imported.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/overview" className="inline-flex h-10 items-center rounded-[5px] bg-accent-strong px-4 text-[13px] font-medium text-white hover:bg-[#3b7cf0]">
          Open investigation center
        </Link>
        <Link href="/procurement" className="inline-flex h-10 items-center rounded-[5px] border border-line-strong px-4 text-[13px] font-medium text-ink hover:bg-panel-2">
          Search procurement data
        </Link>
      </div>
    </main>
  );
}
