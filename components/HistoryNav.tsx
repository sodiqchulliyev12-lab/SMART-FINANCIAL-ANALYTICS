"use client";

import { useRouter } from "next/navigation";

const btn =
  "flex h-8 w-8 items-center justify-center rounded-md text-side-muted hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500";

export function HistoryNav({ back, forward }: { back: string; forward: string }) {
  const router = useRouter();
  return (
    <div className="flex shrink-0 items-center gap-0.5 print:hidden">
      <button type="button" className={btn} onClick={() => router.back()} title={back} aria-label={back}>
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 10H4m5-5-5 5 5 5" /></svg>
      </button>
      <button type="button" className={btn} onClick={() => router.forward()} title={forward} aria-label={forward}>
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h12m-5-5 5 5-5 5" /></svg>
      </button>
    </div>
  );
}
