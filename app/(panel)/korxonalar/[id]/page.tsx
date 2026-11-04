import Link from "next/link";
import { notFound } from "next/navigation";
import { canSeeCompany, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { financialsOf, getCompany, recomputeRisk, riskHistory, taxTypes } from "@/lib/data";
import { FIN_FIELDS, RATIO_META, fmtRatio, quarterOf, ratios } from "@/lib/finance";
import { dateUz, short, som } from "@/lib/format";
import { GROUP_LABEL, type RiskGroup } from "@/lib/risk";
import { REGIMES, iso, periodHuman, todayTashkent } from "@/lib/tax-calendar";
import { AddBox, Card, Notice, PageTitle, Pill, ScoreRing, Sparkline, Table } from "@/components/ui";
import { CompanyForm } from "@/components/CompanyForm";
import { archiveCompany, importFinancials, markDeadline, saveFinancials, setCompanyTaxes } from "../../actions";

export const dynamic = "force-dynamic";

const TONE_CLS = { good: "text-emerald-600", warn: "text-amber-600", bad: "text-red-600" };

export default async function CompanyPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; xato?: string }> }) {
  const u = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || !(await canSeeCompany(u, id))) notFound();
  const c = await getCompany(id);
  if (!c) notFound();
  const sp = await searchParams;
  const sql = db();
  const today = todayTashkent();

  const [risk, fin, history, deadlines, letters, types, linked, staff] = await Promise.all([
    recomputeRisk(id, today),
    financialsOf(id),
    riskHistory(id),
    sql`SELECT d.id, d.davr, to_char(d.muddat,'YYYY-MM-DD') AS muddat, d.hisobot_holati, d.tolov_holati, t.nomi AS soliq
        FROM deadlines d JOIN tax_types t ON t.code = d.soliq
        WHERE d.company_id = ${id} AND (d.hisobot_holati = 'kutilmoqda' OR d.muddat >= current_date - 45)
        ORDER BY d.muddat LIMIT 30`,
    sql`SELECT id, tur, raqam, to_char(javob_muddati,'YYYY-MM-DD') AS javob_muddati, holati FROM letters WHERE company_id = ${id} AND holati = 'yangi' ORDER BY javob_muddati NULLS LAST LIMIT 10`,
    taxTypes(),
    sql`SELECT soliq FROM company_taxes WHERE company_id = ${id}`,
    u.role === "admin" ? sql<{ id: number; fio: string }[]>`SELECT id, fio FROM users WHERE active ORDER BY fio` : Promise.resolve([]),
  ]);
  const r = risk!;
  const last = fin[fin.length - 1];
  const rt = last ? ratios(last) : null;
  const linkedSet = new Set(linked.map((x) => x.soliq as string));
  const recent = fin.slice(-6);
  const maxRev = Math.max(1, ...recent.map((f) => Math.abs(f.tushum)));
  const back = `/korxonalar/${id}/`;

  return (
    <>
      <PageTitle
        title={c.nomi}
        sub={<>STIR {c.stir} · {REGIMES[c.rejim]} · mas&apos;ul: {c.masul ?? "—"}{c.arxiv && <> · <Pill tone="warn">arxivda</Pill></>}</>}
        right={<Link href="/korxonalar/" className="btn-ghost">← Ro&apos;yxat</Link>}
      />
      {sp.ok && <Notice>{sp.ok}</Notice>}
      {sp.xato && <Notice kind="err">{sp.xato}</Notice>}

      {/* Risk xulosasi */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col items-center self-start text-center">
          <ScoreRing score={r.score} />
          <div className="mt-3 grid w-full grid-cols-2 gap-x-4 gap-y-1 text-left text-xs">
            {(Object.keys(r.byGroup) as RiskGroup[]).map((g) => (
              <div key={g} className="flex justify-between"><span className="text-ink-500">{GROUP_LABEL[g]}</span><b className="tabular-nums">{r.byGroup[g]}</b></div>
            ))}
          </div>
          <div className="mt-4 w-full text-left">
            <div className="mb-1 text-xs text-ink-500">90 kunlik tarix</div>
            <Sparkline points={history} />
          </div>
        </Card>
        <Card title="Risk omillari va tavsiyalar" className="lg:col-span-2">
          {r.factors.length === 0 ? (
            <p className="text-sm text-emerald-700">Hozircha xavf belgilari yo&apos;q. Muddatlar va moliyaviy holat me&apos;yorda.</p>
          ) : (
            <ol className="space-y-3">
              {r.factors.map((f) => (
                <li key={f.code} className="rounded-lg border border-ink-100 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="font-medium">{f.title}</div>
                    <div className="flex gap-1.5"><Pill>{GROUP_LABEL[f.group]}</Pill><Pill tone={f.points >= 15 ? "bad" : f.points >= 8 ? "warn" : "plain"}>+{f.points}</Pill></div>
                  </div>
                  <p className="mt-1 text-sm text-ink-700">{f.detail}</p>
                  <p className="mt-2 rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-900">💡 {f.tavsiya}</p>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {/* Moliyaviy tahlil */}
      <section id="moliya" className="mt-6 scroll-mt-6">
        <Card title={`Moliyaviy tahlil${last ? ` · ${periodHuman(last.davr)}` : ""}`}>
          {!rt ? (
            <p className="text-sm text-ink-500">Moliyaviy ma&apos;lumot yo&apos;q. Quyida choraklik balans ko&apos;rsatkichlarini kiriting yoki CSV yuklang.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {RATIO_META.map((m) => {
                  const v = rt[m.key];
                  const tone = v === null ? null : m.good(v);
                  return (
                    <div key={m.key} className="rounded-lg border border-ink-100 p-3">
                      <div className="text-xs text-ink-500">{m.label}</div>
                      <div className={`mt-0.5 text-lg font-semibold tabular-nums ${tone ? TONE_CLS[tone] : "text-ink-500"}`}>{fmtRatio(v, m.fmt)}</div>
                      <div className="text-[11px] text-ink-500">me&apos;yor: {m.norm}</div>
                    </div>
                  );
                })}
              </div>
              <h3 className="mb-2 mt-6 text-sm font-semibold">Tushum va sof foyda dinamikasi</h3>
              <div className="flex h-40 items-end gap-3" role="img" aria-label="Choraklar bo'yicha tushum va foyda">
                {recent.map((f) => (
                  <div key={f.davr} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <div className="text-[11px] tabular-nums text-ink-700">{short(f.tushum)}</div>
                    <div className="flex h-full w-full max-w-20 items-end gap-1">
                      <div className="flex-1 rounded-t bg-brand-500" style={{ height: `${Math.max(2, (Math.abs(f.tushum) / maxRev) * 100)}%` }} title={`Tushum: ${som(f.tushum)}`} />
                      <div className={`flex-1 rounded-t ${f.sof_foyda >= 0 ? "bg-emerald-500" : "bg-red-500"}`} style={{ height: `${Math.max(2, (Math.abs(f.sof_foyda) / maxRev) * 100)}%` }} title={`Sof foyda: ${som(f.sof_foyda)}`} />
                    </div>
                    <div className="text-xs text-ink-500">{f.davr}</div>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-4 text-xs text-ink-500"><span>■ <span className="text-brand-500">tushum</span></span><span>■ <span className="text-emerald-600">sof foyda</span> / <span className="text-red-600">zarar</span></span></div>
              <div className="mt-6">
                <Table head={["Ko'rsatkich", ...recent.map((f) => f.davr)]} align={["l", ...recent.map(() => "r" as const)]}>
                  {FIN_FIELDS.map((ff) => (
                    <tr key={ff.key}>
                      <td className="text-ink-700">{ff.label}</td>
                      {recent.map((f) => <td key={f.davr} className={`text-right tabular-nums ${f[ff.key] < 0 ? "text-red-600" : ""}`}>{som(f[ff.key])}</td>)}
                    </tr>
                  ))}
                </Table>
              </div>
            </>
          )}
          <AddBox title="Chorak ma'lumotini kiritish / tahrirlash">
            <form action={saveFinancials} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <input type="hidden" name="company_id" value={id} />
              <div>
                <label className="label" htmlFor="davr">Davr</label>
                <input id="davr" name="davr" className="input" defaultValue={last?.davr ?? quarterOf(today)} pattern="\d{4}-Q[1-4]" required />
              </div>
              {FIN_FIELDS.map((ff) => (
                <div key={ff.key}>
                  <label className="label" htmlFor={ff.key}>{ff.label}</label>
                  <input id={ff.key} name={ff.key} className="input tabular-nums" inputMode="decimal" defaultValue={last ? String(last[ff.key]) : ""} placeholder="0" />
                  {ff.hint && <p className="mt-1 text-[11px] text-ink-500">{ff.hint}</p>}
                </div>
              ))}
              <div className="sm:col-span-2 lg:col-span-4"><button className="btn">Saqlash va riskni hisoblash</button></div>
            </form>
          </AddBox>
          <AddBox title="1C / Excel'dan CSV yuklash">
            <form action={importFinancials} className="space-y-3">
              <input type="hidden" name="company_id" value={id} />
              <p className="text-xs text-ink-500">Birinchi qator — ustun nomlari. Ajratuvchi: nuqtali vergul, tab yoki vergul. Ustunlar: <code>davr;{FIN_FIELDS.map((f) => f.key).join(";")}</code></p>
              <textarea name="csv" rows={5} className="input font-mono text-xs" placeholder={`davr;tushum;tannarx;sof_foyda;jami_aktiv;joriy_aktiv;pul;joriy_majburiyat;kapital\n2026-Q2;850000000;640000000;42000000;1200000000;700000000;90000000;380000000;600000000`} required />
              <button className="btn">Yuklash</button>
            </form>
          </AddBox>
        </Card>
      </section>

      {/* Muddatlar va xatlar */}
      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card title="Hisobot va to'lov muddatlari" className="lg:col-span-3">
          <Table head={["Soliq", "Davr", "Muddat", "Holat"]}>
            {deadlines.map((d) => {
              const late = d.hisobot_holati === "kutilmoqda" && d.muddat < iso(today);
              return (
                <tr key={d.id}>
                  <td>{d.soliq}</td>
                  <td>{periodHuman(d.davr)}</td>
                  <td><Pill tone={late ? "bad" : d.hisobot_holati === "topshirildi" ? "good" : "info"}>{dateUz(d.muddat)}</Pill></td>
                  <td>
                    <form action={markDeadline} className="inline">
                      <input type="hidden" name="id" value={d.id} /><input type="hidden" name="back" value={back} />
                      <input type="hidden" name="field" value="hisobot_holati" />
                      <input type="hidden" name="value" value={d.hisobot_holati === "topshirildi" ? "kutilmoqda" : "topshirildi"} />
                      <button className="btn-sm">{d.hisobot_holati === "topshirildi" ? "✓ topshirilgan" : "Topshirildi"}</button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </Table>
        </Card>
        <Card title="Javob kutayotgan soliq xatlari" className="lg:col-span-2" right={<Link href="/xatlar/" className="text-xs link">Hammasi →</Link>}>
          <ul className="divide-y divide-ink-100 text-sm">
            {letters.map((l) => (
              <li key={l.id} className="flex justify-between gap-2 py-2">
                <span>{l.tur} №{l.raqam}</span>
                <Pill tone={l.javob_muddati && l.javob_muddati < iso(today) ? "bad" : "warn"}>{dateUz(l.javob_muddati)}</Pill>
              </li>
            ))}
            {!letters.length && <li className="py-6 text-center text-ink-500">Ochiq xat yo&apos;q</li>}
          </ul>
        </Card>
      </div>

      {u.role === "admin" && (
        <Card title="Korxona sozlamalari" className="mt-6">
          <AddBox title="Rekvizitlarni tahrirlash"><CompanyForm c={c} staff={staff} /></AddBox>
          <form action={setCompanyTaxes} className="mb-6">
            <input type="hidden" name="id" value={id} />
            <div className="label">Topshiriladigan soliq hisobotlari</div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
              {types.map((t) => (
                <label key={t.code} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="soliq" value={t.code} defaultChecked={linkedSet.has(t.code)} /> {t.nomi}
                </label>
              ))}
            </div>
            <button className="btn mt-3">Saqlash</button>
          </form>
          <form action={archiveCompany}>
            <input type="hidden" name="id" value={id} /><input type="hidden" name="arxiv" value={c.arxiv ? "0" : "1"} />
            <button className="btn-ghost border border-ink-300">{c.arxiv ? "Arxivdan tiklash" : "Arxivga o'tkazish (mijoz ketdi)"}</button>
          </form>
        </Card>
      )}
    </>
  );
}
