import Link from "next/link";
import { getT } from "@/lib/i18n";
import { companyScope, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { listCompanies } from "@/lib/data";
import { dateUz } from "@/lib/format";
import { levelLabel, levelOf, type RiskFactor, type RiskLevel } from "@/lib/risk";
import { factorText } from "@/lib/i18n-risk";
import { iso, periodHuman, todayTashkent, addDays } from "@/lib/tax-calendar";
import { Card, LEVEL_STYLE, Notice, PageTitle, Pill, RiskBadge, Stat, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ xato?: string }> }) {
  const u = await requireUser();
  const t = await getT();
  const { xato } = await searchParams;
  const scope = companyScope(u);
  const sql = db();
  const today = todayTashkent();
  const companies = await listCompanies(scope);
  const ids = companies.map((c) => c.id);
  const none = ids.length === 0;

  const [overdue, upcoming, letters, ehf, factors] = none
    ? [[], [], [{ n: 0 }], [{ n: 0 }], []]
    : await Promise.all([
        sql`SELECT count(*)::int AS n FROM deadlines WHERE company_id = ANY(${ids}) AND muddat < ${iso(today)} AND hisobot_holati = 'kutilmoqda'`,
        sql`SELECT d.id, d.davr, to_char(d.muddat,'YYYY-MM-DD') AS muddat, t.nomi AS soliq, c.nomi AS korxona, c.id AS cid
            FROM deadlines d JOIN tax_types t ON t.code = d.soliq JOIN companies c ON c.id = d.company_id
            WHERE d.company_id = ANY(${ids}) AND d.hisobot_holati = 'kutilmoqda' AND d.muddat <= ${iso(addDays(today, 7))}
            ORDER BY d.muddat, c.nomi LIMIT 12`,
        sql`SELECT count(*)::int AS n FROM letters WHERE company_id = ANY(${ids}) AND holati = 'yangi'`,
        sql`SELECT count(*)::int AS n FROM ehf WHERE company_id = ANY(${ids}) AND holati = 'imzo_kutmoqda'`,
        sql`SELECT DISTINCT ON (company_id) company_id, omillar FROM risk_snapshots WHERE company_id = ANY(${ids}) ORDER BY company_id, sana DESC`,
      ]);
  const topFactor = new Map<number, RiskFactor | undefined>((factors as { company_id: number; omillar: RiskFactor[] }[]).map((r) => [r.company_id, r.omillar[0]]));
  const overdueN = (overdue as { n: number }[])[0]?.n ?? 0;

  const dist: Record<RiskLevel, number> = { past: 0, orta: 0, yuqori: 0, kritik: 0 };
  for (const c of companies) if (c.ball !== null) dist[levelOf(c.ball)]++;
  const scored = companies.filter((c) => c.ball !== null).length || 1;
  const hot = companies.filter((c) => (c.ball ?? 0) >= 25).slice(0, 10);

  return (
    <>
      <PageTitle title="Risk paneli" sub={t(scope ? "Bugun {d} · sizga biriktirilgan korxonalar: {n}" : "Bugun {d} · nazoratdagi korxonalar: {n}", { d: dateUz(iso(today)), n: companies.length })} />

      {xato && <Notice kind="err">{xato}</Notice>}
      {none && (
        <Card className="mb-6 border-brand-100 bg-brand-50">
          <p className="text-sm text-ink-700">
            {t("Hali korxona yo'q.")} {u.role === "admin" ? <><Link className="link" href="/korxonalar/">{t("Korxonalar")}</Link> {t("bo'limida birinchi mijozni qo'shing — soliq muddatlari va risk avtomatik hisoblanadi.")}</> : t("Rahbariyat sizga korxona biriktirishi kerak.")}
          </p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Kritik va yuqori risk" value={dist.kritik + dist.yuqori} tone={dist.kritik ? "bad" : dist.yuqori ? "warn" : "good"} hint={`${dist.kritik} ${levelLabel("kritik", t.lang).toLowerCase()} · ${dist.yuqori} ${levelLabel("yuqori", t.lang).toLowerCase()}`} href="/korxonalar/" />
        <Stat label="Kechikkan hisobotlar" value={overdueN} tone={overdueN ? "bad" : "good"} href="/muddatlar/?f=kechikkan" />
        <Stat label="Javob kutayotgan xatlar" value={(letters as { n: number }[])[0].n} tone={(letters as { n: number }[])[0].n ? "warn" : "good"} href="/xatlar/" />
        <Stat label="Imzo kutayotgan EHF" value={(ehf as { n: number }[])[0].n} tone={(ehf as { n: number }[])[0].n ? "warn" : "good"} href="/ehf/" />
      </div>

      <Card title="Portfel bo'yicha risk taqsimoti" className="mt-6">
        <div className="flex h-4 w-full overflow-hidden rounded-full bg-ink-100" role="img" aria-label={t("Risk taqsimoti")}>
          {(Object.keys(dist) as RiskLevel[]).map((lv) => dist[lv] ? <div key={lv} className={LEVEL_STYLE[lv].bar} style={{ width: `${(dist[lv] / scored) * 100}%` }} title={`${levelLabel(lv, t.lang)}: ${dist[lv]}`} /> : null)}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink-700">
          {(Object.keys(dist) as RiskLevel[]).map((lv) => (
            <span key={lv} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${LEVEL_STYLE[lv].bar}`} />{levelLabel(lv, t.lang)}: <b>{dist[lv]}</b></span>
          ))}
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card title="Diqqat talab qiladigan korxonalar" className="lg:col-span-3">
          <Table head={["Korxona", "Risk", "Asosiy sabab"]} empty="Hamma korxonalar past riskda 👍">
            {hot.map((c) => {
              const f = topFactor.get(c.id);
              return (
                <tr key={c.id}>
                  <td><Link href={`/korxonalar/${c.id}/`} className="link">{c.nomi}</Link><div className="text-xs text-ink-500">{c.masul ?? t("mas'ul yo'q")}</div></td>
                  <td><RiskBadge score={c.ball} /></td>
                  <td className="text-ink-700">{f ? <><b className="font-medium">{factorText(f, t).title}</b><div className="text-xs text-ink-500">{factorText(f, t).detail}</div></> : "—"}</td>
                </tr>
              );
            })}
          </Table>
        </Card>
        <Card title="7 kun ichidagi muddatlar" className="lg:col-span-2" right={<Link href="/muddatlar/" className="text-xs link">{t("Hammasi")} →</Link>}>
          <ul className="divide-y divide-ink-100 text-sm">
            {(upcoming as { id: number; davr: string; muddat: string; soliq: string; korxona: string; cid: number }[]).map((d) => {
              const late = d.muddat < iso(today);
              return (
                <li key={d.id} className="flex items-start justify-between gap-3 py-2">
                  <div>
                    <div className="font-medium">{t(d.soliq)} <span className="font-normal text-ink-500">· {periodHuman(d.davr, t.lang)}</span></div>
                    <Link href={`/korxonalar/${d.cid}/`} className="text-xs text-ink-500 hover:underline">{d.korxona}</Link>
                  </div>
                  <Pill tone={late ? "bad" : d.muddat === iso(today) ? "warn" : "info"}>{late ? `${t("kechikdi")} ` : ""}{dateUz(d.muddat)}</Pill>
                </li>
              );
            })}
            {!upcoming.length && <li className="py-6 text-center text-ink-500">{t("Yaqin muddat yo'q")}</li>}
          </ul>
        </Card>
      </div>
    </>
  );
}
