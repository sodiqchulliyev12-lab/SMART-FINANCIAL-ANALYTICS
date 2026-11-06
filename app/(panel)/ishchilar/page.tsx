import Link from "next/link";
import { getT } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dateUz } from "@/lib/format";
import { turnover90 } from "@/lib/risk";
import { companyOptions, scopeSql } from "@/lib/scope";
import { addDays, iso, todayTashkent } from "@/lib/tax-calendar";
import { AddButton, Card, Field, Notice, PageTitle, Pill, Select, Stat, Table } from "@/components/ui";
import { dismissWorker, saveWorker } from "../actions";

export const dynamic = "force-dynamic";

export default async function Workers({ searchParams }: { searchParams: Promise<{ k?: string; ok?: string; xato?: string }> }) {
  const u = await requireUser();
  const t = await getT();
  const sp = await searchParams;
  const sql = db();
  const today = todayTashkent();
  const d30 = iso(addDays(today, -30));
  const d90 = iso(addDays(today, -90));
  const k = Number(sp.k) || null;
  const [summary, opts] = await Promise.all([
    sql`SELECT c.id, c.nomi,
               count(w.id) FILTER (WHERE w.ketgan IS NULL)::int AS active,
               count(w.id) FILTER (WHERE w.kirgan > ${d30})::int AS hired30,
               count(w.id) FILTER (WHERE w.ketgan > ${d30})::int AS left30,
               count(w.id) FILTER (WHERE w.kirgan > ${d90})::int AS hired90,
               count(w.id) FILTER (WHERE w.ketgan > ${d90})::int AS left90,
               count(w.id)::int AS jami
        FROM companies c LEFT JOIN workers w ON w.company_id = c.id
        WHERE TRUE ${scopeSql(u)} GROUP BY c.id ORDER BY active DESC, c.nomi`,
    companyOptions(u),
  ]);
  const visible = new Set(summary.map((r) => r.id as number));
  const sel = k && visible.has(k) ? k : null;
  const ids = sel ? [sel] : [...visible];
  const [moves, list] = await Promise.all([
    ids.length ? sql`
      SELECT * FROM (
        SELECT w.id, w.fio, w.lavozim, to_char(w.kirgan,'YYYY-MM-DD') AS sana, 'kirdi' AS tur, c.nomi AS korxona, c.id AS cid FROM workers w JOIN companies c ON c.id = w.company_id
          WHERE w.company_id = ANY(${ids}) AND w.kirgan > ${d90}
        UNION ALL
        SELECT w.id, w.fio, w.lavozim, to_char(w.ketgan,'YYYY-MM-DD'), 'ketdi', c.nomi, c.id FROM workers w JOIN companies c ON c.id = w.company_id
          WHERE w.company_id = ANY(${ids}) AND w.ketgan > ${d90}
      ) m ORDER BY sana DESC LIMIT 100` : [],
    sel ? sql`SELECT id, fio, lavozim, shartnoma, to_char(kirgan,'YYYY-MM-DD') AS kirgan FROM workers WHERE company_id = ${sel} AND ketgan IS NULL ORDER BY fio` : [],
  ]);
  const tot = summary.reduce((a, r) => ({ active: a.active + r.active, hired30: a.hired30 + r.hired30, left30: a.left30 + r.left30 }), { active: 0, hired30: 0, left30: 0 });
  const selName = sel ? summary.find((r) => r.id === sel)?.nomi : null;

  return (
    <>
      <PageTitle title="Ishchilar" sub="Korxonalarda kim ishlayapti, kim keldi, kim ketdi. Manba: my.mehnat.uz (Yagona milliy mehnat tizimi) yoki qo'lda kiritish."
        right={opts.length > 0 && (
    <AddButton title="Ishchini qo'lda qo'shish">
      <form action={saveWorker} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Select label="Korxona" name="company_id" options={opts} defaultValue={sel ? String(sel) : undefined} required />
        <Field label="F.I.Sh." name="fio" required />
        <Field label="Lavozim" name="lavozim" />
        <Select label="Shartnoma" name="shartnoma" options={[["muddatsiz", "Muddatsiz"], ["muddatli", "Muddatli"], ["o'rindosh", "O'rindoshlik"], ["fhsh", "Fuqarolik-huquqiy"]]} />
        <Field label="Ishga kirgan" name="kirgan" type="date" required />
        <Field label="Bo'shagan (agar ketgan bo'lsa)" name="ketgan" type="date" />
        <div className="self-end"><button className="btn">{t("Saqlash")}</button></div>
      </form>
    </AddButton>
  )} />
      {sp.ok && <Notice>{sp.ok}</Notice>}
      {sp.xato && <Notice kind="err">{sp.xato}</Notice>}

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="Hozir ishlayapti" value={tot.active} />
        <Stat label="30 kunda ishga kirdi" value={tot.hired30} tone={tot.hired30 ? "good" : "plain"} />
        <Stat label="30 kunda bo'shadi" value={tot.left30} tone={tot.left30 ? "warn" : "plain"} />
      </div>


      <Card title="Korxonalar bo'yicha" className="mb-6">
        <Table head={["Korxona", "Hozir", "30 kunda +", "30 kunda −", "90 kunda ketish", ""]} align={["l", "r", "r", "r", "r", "r"]}>
          {summary.map((r) => {
            const tv = turnover90({ active: r.active, hired90: r.hired90, left90: r.left90 });
            return (
              <tr key={r.id} className={r.id === sel ? "bg-brand-50/60" : ""}>
                <td><Link href={`/korxonalar/${r.id}/`} className="link">{r.nomi}</Link></td>
                <td className="text-right font-semibold tabular-nums">{r.jami ? r.active : <span className="font-normal text-ink-500">{t("ma'lumot yo'q")}</span>}</td>
                <td className="text-right tabular-nums text-emerald-700">{r.hired30 || "—"}</td>
                <td className="text-right tabular-nums text-amber-700">{r.left30 || "—"}</td>
                <td className="text-right">{r.left90 ? <Pill tone={tv >= 0.4 ? "bad" : tv >= 0.2 ? "warn" : "plain"}>{t("{n} kishi", { n: r.left90 })} · {Math.round(tv * 100)}%</Pill> : "—"}</td>
                <td className="text-right"><Link href={`/ishchilar/?k=${r.id}`} className="text-xs link">{t("Ro'yxat")} →</Link></td>
              </tr>
            );
          })}
        </Table>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={`${t("Oxirgi 90 kundagi harakat")}${selName ? ` · ${selName}` : ""}`} right={sel ? <Link href="/ishchilar/" className="text-xs link">{t("Barcha korxonalar")}</Link> : undefined}>
          <ul className="divide-y divide-ink-100 text-sm">
            {(moves as { id: number; fio: string; lavozim: string; sana: string; tur: string; korxona: string }[]).map((m) => (
              <li key={`${m.tur}${m.id}`} className="flex items-start justify-between gap-3 py-2">
                <div>
                  <div className="font-medium">{m.fio || "—"}</div>
                  <div className="text-xs text-ink-500">{[m.lavozim, sel ? null : m.korxona].filter(Boolean).join(" · ")}</div>
                </div>
                <Pill tone={m.tur === "kirdi" ? "good" : "warn"}>{t(m.tur === "kirdi" ? "kirdi" : "ketdi")} {dateUz(m.sana)}</Pill>
              </li>
            ))}
            {!moves.length && <li className="py-6 text-center text-ink-500">{t("Harakat yo'q")}</li>}
          </ul>
        </Card>
        {sel && (
          <Card title={`${t("Hozir ishlayotganlar")} (${list.length})`}>
            <ul className="divide-y divide-ink-100 text-sm">
              {(list as { id: number; fio: string; lavozim: string; shartnoma: string; kirgan: string }[]).map((w) => (
                <li key={w.id} className="flex flex-wrap items-start justify-between gap-2 py-2">
                  <div>
                    <div className="font-medium">{w.fio}</div>
                    <div className="text-xs text-ink-500">{[w.lavozim, w.shartnoma && t(w.shartnoma), `${t("kirgan")} ${dateUz(w.kirgan)}`].filter(Boolean).join(" · ")}</div>
                  </div>
                  <details className="[&_summary]:cursor-pointer">
                    <summary className="btn-sm list-none">{t("Bo'shadi")}…</summary>
                    <form action={dismissWorker} className="mt-2 flex items-center gap-1">
                      <input type="hidden" name="id" value={w.id} />
                      <input type="date" name="ketgan" className="input w-36 py-1 text-xs" aria-label={t("Bo'shagan sana")} required />
                      <button className="btn-sm">OK</button>
                    </form>
                  </details>
                </li>
              ))}
              {!list.length && <li className="py-6 text-center text-ink-500">{t("Faol ishchi yo'q")}</li>}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
