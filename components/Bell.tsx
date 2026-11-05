import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import type { User } from "@/lib/auth";
import { scopeSql } from "@/lib/scope";
import { addDays, iso, todayTashkent } from "@/lib/tax-calendar";

type Item = { n: number; label: string; href: string; tone: "bad" | "warn" | "info" };

/** Qo'ng'iroqcha: e'tibor talab qiladigan hamma narsa bir ro'yxatda (muddatlar, xatlar, EHF, risk, AI Soliq, ijara, bojxona) */
export async function Bell({ user }: { user: User }) {
  const t = await getT();
  const sql = db();
  const today = todayTashkent();
  const d = iso(today);
  const sc = scopeSql(user);
  const one = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;
  const [late, soon, letters, lettersDue, ehf, risky, ai, leases, customs] = await Promise.all([
    one(sql`SELECT count(*)::int AS n FROM deadlines d JOIN companies c ON c.id = d.company_id WHERE d.hisobot_holati = 'kutilmoqda' AND d.muddat < ${d} ${sc}`),
    one(sql`SELECT count(*)::int AS n FROM deadlines d JOIN companies c ON c.id = d.company_id WHERE d.hisobot_holati = 'kutilmoqda' AND d.muddat BETWEEN ${d} AND ${iso(addDays(today, 3))} ${sc}`),
    one(sql`SELECT count(*)::int AS n FROM letters l JOIN companies c ON c.id = l.company_id WHERE l.holati = 'yangi' ${sc}`),
    one(sql`SELECT count(*)::int AS n FROM letters l JOIN companies c ON c.id = l.company_id WHERE l.holati = 'yangi' AND l.javob_muddati <= ${iso(addDays(today, 3))} ${sc}`),
    one(sql`SELECT count(*)::int AS n FROM ehf e JOIN companies c ON c.id = e.company_id WHERE e.holati = 'imzo_kutmoqda' ${sc}`),
    one(sql`SELECT count(*)::int AS n FROM (SELECT DISTINCT ON (company_id) company_id, ball FROM risk_snapshots ORDER BY company_id, sana DESC) r
            JOIN companies c ON c.id = r.company_id WHERE r.ball >= 50 ${sc}`),
    one(sql`SELECT count(*)::int AS n FROM ai_soliq a JOIN companies c ON c.id = a.company_id
            WHERE (jsonb_array_length(a.avtokameral) > 0 OR jsonb_array_length(a.kamchiliklar) > 0 OR a.qarz > 0) ${sc}`),
    one(sql`SELECT count(*)::int AS n FROM leases l JOIN companies c ON c.id = l.company_id WHERE l.holati = 'faol' AND l.tugash <= ${iso(addDays(today, 30))} ${sc}`),
    one(sql`SELECT count(*)::int AS n FROM customs_debts b JOIN companies c ON c.id = b.company_id WHERE b.summa > 0 ${sc}`),
  ]);
  const items: Item[] = [
    { n: late, label: "Kechikkan hisobotlar", href: "/muddatlar/?f=kechikkan", tone: "bad" },
    { n: lettersDue, label: "Javob muddati 3 kun ichida tugaydigan xatlar", href: "/xatlar/", tone: "bad" },
    { n: risky, label: "Yuqori va kritik riskdagi korxonalar", href: "/korxonalar/", tone: "bad" },
    { n: customs, label: "Bojxona qarzi bor korxonalar", href: "/bojxona/", tone: "bad" },
    { n: soon, label: "3 kun ichidagi muddatlar", href: "/muddatlar/", tone: "warn" },
    { n: ai, label: "AI Soliq kamchilik topgan korxonalar", href: "/korxonalar/", tone: "warn" },
    { n: letters, label: "Javob kutayotgan soliq xatlari", href: "/xatlar/", tone: "warn" },
    { n: ehf, label: "Imzo kutayotgan EHF", href: "/ehf/", tone: "info" },
    { n: leases, label: "30 kunda tugaydigan ijara shartnomalari", href: "/ijara/", tone: "info" },
  ].filter((i) => i.n > 0) as Item[];
  const total = late + soon + letters + ehf + risky + ai + leases + customs; // lettersDue — letters ichida
  const dot = { bad: "bg-red-500", warn: "bg-amber-500", info: "bg-brand-500" };
  return (
    <details className="group relative">
      <summary className="relative flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md text-side-muted hover:bg-white/10 hover:text-white [&::-webkit-details-marker]:hidden" aria-label={t("Bildirishnomalar")}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
        {total > 0 && <span className="absolute -right-1 -top-1 min-w-[1.15rem] rounded-full bg-red-500 px-1 text-center text-[10px] font-semibold leading-[1.15rem] text-white">{total > 99 ? "99+" : total}</span>}
      </summary>
      <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-ink-100 bg-surface text-ink-900 shadow-xl">
        <div className="border-b border-ink-100 px-4 py-2.5 text-sm font-semibold">{t("Bildirishnomalar")}</div>
        {items.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-ink-500">{t("Hozircha eslatma yo'q 👍")}</p>
        ) : (
          <ul className="max-h-[28rem] divide-y divide-ink-100 overflow-y-auto">
            {items.map((i) => (
              <li key={i.label}>
                <a href={i.href} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-ink-50">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${dot[i.tone]}`} />
                  <span className="min-w-0 flex-1">{t(i.label)}</span>
                  <b className="tabular-nums">{i.n}</b>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
