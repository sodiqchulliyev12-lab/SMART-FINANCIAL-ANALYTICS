import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dateUz, short } from "@/lib/format";
import { getT } from "@/lib/i18n";
import { levelLabel, levelOf, type RiskLevel } from "@/lib/risk";
import { scopeSql } from "@/lib/scope";
import { iso, todayTashkent } from "@/lib/tax-calendar";
import {
  balanceAt, discipline, lastQuarters, liquidityState, ppDiff, qKey, qRange, ratio, sumFlow, taxNormState, TAX_NORM, yoyPct,
  type FinRow, type Q, type Rejim,
} from "@/lib/analytics";
import { C, Donut, HBars, Kpi, StackBars, VBars } from "@/components/charts";
import { Card, LEVEL_STYLE, Notice, PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

type Sp = { y?: string; q?: string; k?: string; r?: string; m?: string; p?: string };
const REJIM: Record<Rejim, string> = { qqs: "QQS to'lovchi", soddalashtirilgan: "Soddalashtirilgan", aylanma: "Aylanmadan soliq" };

export default async function Analytics({ searchParams }: { searchParams: Promise<Sp> }) {
  const u = await requireUser();
  const t = await getT();
  const sp = await searchParams;
  const sql = db();
  const today = iso(todayTashkent());
  const L = t.lang;
  const money = (v: number) => short(v, L);
  const pct = (v: number | null, d = 1) => (v === null ? "—" : `${(v * 100).toFixed(d).replace(".", ",")}%`);
  const num2 = (v: number | null) => (v === null ? "—" : v.toFixed(2).replace(".", ","));

  // --- Filtr uchun ro'yxatlar (foydalanuvchi ko'rinishi doirasida)
  const [allCos, staff] = await Promise.all([
    sql<{ id: number; nomi: string; rejim: Rejim; masul_id: number | null; ball: number | null }[]>`
      SELECT c.id, c.nomi, c.rejim, c.masul_id, r.ball FROM companies c
      LEFT JOIN LATERAL (SELECT ball FROM risk_snapshots s WHERE s.company_id = c.id ORDER BY sana DESC LIMIT 1) r ON TRUE
      WHERE TRUE ${scopeSql(u)} ORDER BY c.nomi`,
    u.role === "admin" ? sql<{ id: number; fio: string }[]>`SELECT id, fio FROM users WHERE active ORDER BY fio` : Promise.resolve([]),
  ]);
  const k = allCos.some((c) => String(c.id) === sp.k) ? Number(sp.k) : null;
  const r = sp.r && sp.r in REJIM ? (sp.r as Rejim) : null;
  const m = u.role === "admin" && staff.some((s) => String(s.id) === sp.m) ? Number(sp.m) : null;
  const cos = allCos.filter((c) => (!k || c.id === k) && (!r || c.rejim === r) && (!m || c.masul_id === m));
  const ids = cos.map((c) => c.id);
  const idSet = new Set(ids);
  const byId = new Map(cos.map((c) => [c.id, c]));

  const [fin, dl, ehf, letters, customs, snap] = ids.length
    ? await Promise.all([
        sql<FinRow[]>`SELECT company_id, davr, tushum::float8 AS tushum, sof_foyda::float8 AS sof_foyda, joriy_aktiv::float8 AS joriy_aktiv,
            joriy_majburiyat::float8 AS joriy_majburiyat, soliq_tolangan::float8 AS soliq_tolangan, kreditorlik::float8 AS kreditorlik,
            budjet_qarz::float8 AS budjet_qarz, uzoq_majburiyat::float8 AS uzoq_majburiyat, kapital::float8 AS kapital, pul::float8 AS pul
          FROM financials WHERE company_id = ANY(${ids})`,
        sql<{ company_id: number; muddat: string; holat: string }[]>`SELECT company_id, to_char(muddat,'YYYY-MM-DD') AS muddat, hisobot_holati AS holat
          FROM deadlines WHERE company_id = ANY(${ids}) AND muddat <= ${today}`,
        sql<{ company_id: number; n: number }[]>`SELECT company_id, count(*)::int AS n FROM ehf WHERE company_id = ANY(${ids}) AND holati = 'imzo_kutmoqda' GROUP BY 1`,
        sql<{ company_id: number; n: number }[]>`SELECT company_id, count(*)::int AS n FROM letters WHERE company_id = ANY(${ids}) AND holati = 'yangi' GROUP BY 1`,
        sql<{ s: number }[]>`SELECT coalesce(sum(summa),0)::float8 AS s FROM customs_debts WHERE company_id = ANY(${ids})`,
        sql<{ d: string | null }[]>`SELECT to_char(max(sana),'YYYY-MM-DD') AS d FROM risk_snapshots WHERE company_id = ANY(${ids})`,
      ])
    : [[], [], [], [], [{ s: 0 }], [{ d: null }]];

  // --- Davr: yil (+ixtiyoriy chorak). Standart — ma'lumot bor oxirgi yil.
  const davrs = [...new Set(fin.map((f) => f.davr))].sort();
  const years = [...new Set(davrs.map((d) => Number(d.slice(0, 4))))];
  const nowY = Number(today.slice(0, 4));
  const y = /^\d{4}$/.test(sp.y ?? "") ? Number(sp.y) : years.length ? years[years.length - 1] : nowY;
  const qn = /^[1-4]$/.test(sp.q ?? "") ? Number(sp.q) : null;
  const curQs: Q[] = qn ? [{ y, q: qn }] : [1, 2, 3, 4].map((q) => ({ y, q }));
  const prevQs: Q[] = curQs.map((p) => ({ y: p.y - 1, q: p.q }));
  // Balans: tanlangan davrdagi ma'lumot bor oxirgi chorak
  const haveCur = curQs.filter((p) => davrs.includes(qKey(p)));
  const endQ: Q = haveCur.length ? haveCur[haveCur.length - 1] : curQs[curQs.length - 1];
  const prevEnd: Q = { y: endQ.y - 1, q: endQ.q };
  const curSet = new Set(haveCur.map(qKey));
  const prevSet = new Set(prevQs.filter((p) => haveCur.some((c) => c.q === p.q)).map(qKey));
  const [from, to] = [qRange(curQs[0])[0], qRange(curQs[curQs.length - 1])[1]];
  const [pFrom, pTo] = [qRange(prevQs[0])[0], qRange(prevQs[prevQs.length - 1])[1]];

  const cur = sumFlow(fin, curSet), prev = sumFlow(fin, prevSet);
  const bal = balanceAt(fin, qKey(endQ)), pBal = balanceAt(fin, qKey(prevEnd));
  const marja = ratio(cur.foyda, cur.tushum), pMarja = ratio(prev.foyda, prev.tushum);
  const yuk = ratio(cur.soliq, cur.tushum), pYuk = ratio(prev.soliq, prev.tushum);
  const dis = discipline(dl, from, to, today), pDis = discipline(dl, pFrom, pTo, today);

  // 8 chorak trendi
  const spark = lastQuarters(endQ, 8);
  const sq = (fn: (s: Set<string>, p: Q) => number | null) => spark.map((p) => (davrs.includes(qKey(p)) ? fn(new Set([qKey(p)]), p) : null));
  const sTushum = sq((s) => sumFlow(fin, s).tushum);
  const sMarja = sq((s) => { const f = sumFlow(fin, s); return ratio(f.foyda, f.tushum); });
  const sLikv = sq((_, p) => balanceAt(fin, qKey(p)).likvidlik);
  const sYuk = sq((s) => { const f = sumFlow(fin, s); return ratio(f.soliq, f.tushum); });
  const sDis = spark.map((p) => { const [a, b] = qRange(p); return discipline(dl, a, b, today).pct; });

  // --- Korxona kesimida
  const per = cos.map((c) => {
    const one = new Set([c.id]);
    const f = sumFlow(fin, curSet, one);
    const b = balanceAt(fin, qKey(endQ), one);
    const kap = fin.find((x) => x.company_id === c.id && x.davr === qKey(endQ))?.kapital ?? null;
    const late = dl.filter((d) => d.company_id === c.id && d.holat === "kutilmoqda").length;
    return { ...c, tushum: f.tushum, has: f.n > 0, marja: ratio(f.foyda, f.tushum), likv: b.likvidlik, yuk: ratio(f.soliq, f.tushum), kap, late,
      ehf: ehf.find((e) => e.company_id === c.id)?.n ?? 0, xat: letters.find((e) => e.company_id === c.id)?.n ?? 0 };
  });
  const lowLiq = per.filter((p) => p.has && liquidityState(p.likv) !== "ok" && p.likv !== null).length;
  const offNorm = per.filter((p) => p.has && taxNormState(p.rejim, p.yuk) === "past").length;

  // --- URL yordamchisi (filtrlar saqlanadi)
  const href = (over: Partial<Record<keyof Sp, string | number | null>>) => {
    const v: Record<string, string | number | null> = { y: sp.y ? y : null, q: qn, k, r, m, p: sp.p === "chorak" ? "chorak" : null, ...over };
    const s = new URLSearchParams(Object.entries(v).filter(([, x]) => x !== null && x !== "").map(([a, b]) => [a, String(b)])).toString();
    return `/tahlil/${s ? `?${s}` : ""}`;
  };

  // Drilldown: yillar → tanlangan yil choraklari
  const drill = sp.p === "chorak";
  const bars = drill
    ? [1, 2, 3, 4].map((q) => ({ label: `${q}-${t("chorak")}`, value: sumFlow(fin, new Set([`${y}-Q${q}`])).tushum, href: href({ q: qn === q ? null : q, p: "chorak", y }), active: qn ? qn === q : undefined }))
    : years.map((yy) => ({ label: String(yy), value: sumFlow(fin, new Set(davrs.filter((d) => d.startsWith(`${yy}-`)))).tushum, href: href({ y: yy, p: "chorak", q: null }), active: yy === y }));

  const debt = [
    { label: t("Kreditorlik qarzi"), value: bal.kred, color: C.s1 },
    { label: t("Budjetga qarz"), value: bal.bud, color: C.s2 },
    { label: t("Uzoq muddatli majburiyat"), value: bal.uzoq, color: C.s3 },
    { label: t("Bojxona qarzi"), value: customs[0].s, color: C.s4 },
  ];

  const yukBars = per.filter((p) => p.has && p.yuk !== null).sort((a, b) => (a.yuk! - b.yuk!)).slice(0, 8).map((p) => {
    const st = taxNormState(p.rejim, p.yuk);
    return { label: `${st === "past" ? "⚠ " : ""}${p.nomi}`, value: p.yuk! * 100, href: href({ k: p.id }),
      title: `${p.nomi}: ${pct(p.yuk)} · ${t("me'yor")} ${TAX_NORM[p.rejim].map((x) => `${x * 100}%`).join("–")} (${t(REJIM[p.rejim])})` };
  });

  const work = per.map((p) => ({ label: p.nomi, parts: [p.late, p.ehf, p.xat], href: `/korxonalar/${p.id}/` }))
    .filter((w) => w.parts.some(Boolean)).sort((a, b) => b.parts.reduce((s, v) => s + v, 0) - a.parts.reduce((s, v) => s + v, 0)).slice(0, 8);

  const dist: Record<RiskLevel, number> = { past: 0, orta: 0, yuqori: 0, kritik: 0 };
  for (const c of cos) if (c.ball !== null) dist[levelOf(c.ball)]++;
  const riskColor: Record<RiskLevel, string> = { past: C.good, orta: C.warn, yuqori: C.serious, kritik: C.bad };

  const periodLabel = qn ? `${y} · ${qn}-${t("chorak")}` : t("{y} yil", { y });
  const pyLabel = t("O'tgan yil");
  const filtered = Boolean(sp.y || qn || k || r || m);

  return (
    <>
      <PageTitle title="Moliyaviy tahlil" sub={`${periodLabel} · ${t("korxonalar: {n}", { n: cos.length })}${snap[0].d ? ` · ${t("yangilangan")} ${dateUz(snap[0].d)}` : ""}`} />

      <form className="mb-5 grid grid-cols-2 gap-3 rounded-xl border border-ink-100 bg-surface p-4 shadow-sm lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]" aria-label={t("Filtr")}>
        {drill && <input type="hidden" name="p" value="chorak" />}
        <div>
          <label className="label" htmlFor="y">{t("Yil")}</label>
          <select id="y" name="y" defaultValue={sp.y ? y : ""} className="input">
            <option value="">{t("Oxirgi yil")}</option>
            {[...new Set([...years, nowY])].sort().map((yy) => <option key={yy} value={yy}>{yy}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="q">{t("Chorak")}</label>
          <select id="q" name="q" defaultValue={qn ?? ""} className="input">
            <option value="">{t("Butun yil")}</option>
            {[1, 2, 3, 4].map((q) => <option key={q} value={q}>{q}-{t("chorak")}</option>)}
          </select>
        </div>
        <div className="col-span-2 lg:col-span-1">
          <label className="label" htmlFor="k">{t("Korxona")}</label>
          <select id="k" name="k" defaultValue={k ?? ""} className="input">
            <option value="">{t("Barcha korxonalar")}</option>
            {allCos.map((c) => <option key={c.id} value={c.id}>{c.nomi}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="r">{t("Soliq rejimi")}</label>
          <select id="r" name="r" defaultValue={r ?? ""} className="input">
            <option value="">{t("Hammasi")}</option>
            {(Object.keys(REJIM) as Rejim[]).map((x) => <option key={x} value={x}>{t(REJIM[x])}</option>)}
          </select>
        </div>
        {u.role === "admin" ? (
          <div>
            <label className="label" htmlFor="m">{t("Mas'ul buxgalter")}</label>
            <select id="m" name="m" defaultValue={m ?? ""} className="input">
              <option value="">{t("Hammasi")}</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.fio}</option>)}
            </select>
          </div>
        ) : <div className="hidden lg:block" />}
        <div className="col-span-2 flex items-end gap-2 lg:col-span-1">
          <button className="btn flex-1 lg:flex-none">{t("Ko'rsatish")}</button>
          {filtered && <Link href="/tahlil/" className="btn-ghost">{t("Tozalash")}</Link>}
        </div>
      </form>

      {!ids.length && <Notice kind="err">{t("Tanlangan filtr bo'yicha korxona yo'q.")}</Notice>}
      {ids.length > 0 && !fin.length && <Notice kind="err">{t("Moliyaviy ko'rsatkichlar hali kiritilmagan — korxona sahifasida chorak ma'lumotini kiriting yoki CSV yuklang.")}</Notice>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Kpi label={t("Tushum")} value={money(cur.tushum)} spark={sTushum} pyLabel={pyLabel} py={prev.n ? money(prev.tushum) : "—"} delta={yoyPct(cur.tushum, prev.n ? prev.tushum : null)} />
        <Kpi label={t("Sof foyda marjasi")} value={pct(marja)} spark={sMarja} pyLabel={pyLabel} py={pct(pMarja)} delta={ppDiff(marja, pMarja)} deltaUnit={t(" p.p.")} />
        <Kpi label={t("Joriy likvidlik")} value={num2(bal.likvidlik)} spark={sLikv} pyLabel={pyLabel} py={num2(pBal.likvidlik)}
          delta={bal.likvidlik !== null && pBal.likvidlik !== null ? (bal.likvidlik - pBal.likvidlik) * 100 / Math.abs(pBal.likvidlik || 1) : null}
          hint={lowLiq ? t("{n} ta korxonada 1,0 dan past", { n: lowLiq }) : t("Me'yor: 1,0 dan yuqori")} />
        <Kpi label={t("Soliq yuki")} value={pct(yuk)} spark={sYuk} pyLabel={pyLabel} py={pct(pYuk)} delta={ppDiff(yuk, pYuk)} deltaUnit={t(" p.p.")}
          hint={offNorm ? t("{n} ta korxonada me'yordan past", { n: offNorm }) : t("To'langan soliq / tushum")} />
        <Kpi label={t("Hisobot intizomi")} value={pct(dis.pct, 0)} spark={sDis} pyLabel={pyLabel} py={pct(pDis.pct, 0)} delta={ppDiff(dis.pct, pDis.pct)} deltaUnit={t(" p.p.")}
          hint={dis.late ? t("{n} ta hisobot kechikkan", { n: dis.late }) : t("Kechikkan hisobot yo'q")} href={`/muddatlar/?f=kechikkan`} />
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-3">
        <Card title={drill ? t("Tushum: {y} yil choraklari", { y }) : t("Tushum: yillar bo'yicha")}
          right={drill ? <Link href={href({ p: null, q: null })} className="text-xs font-medium text-brand-700 hover:underline">← {t("Yillarga qaytish")}</Link> : <span className="text-xs text-ink-500">{t("Yilni bosing → choraklar")}</span>}>
          <VBars items={bars} fmt={money} empty={t("Ma'lumot yo'q")} />
        </Card>
        <Card title={t("Majburiyatlar tarkibi")} right={<span className="text-xs text-ink-500">{qKey(endQ)}</span>}>
          <Donut items={debt} fmt={money} center={money(debt.reduce((s, d) => s + d.value, 0))} empty={t("Ma'lumot yo'q")} />
        </Card>
        <Card title={t("Soliq yuki: eng pastlari")} right={<span className="text-xs text-ink-500">⚠ {t("me'yordan past")}</span>}>
          <HBars items={yukBars} fmt={(v) => `${v.toFixed(1).replace(".", ",")}%`} empty={t("Ma'lumot yo'q")} />
        </Card>
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
        <Card title={t("Ish navbati: korxonalar")}>
          <StackBars items={work} empty={t("Navbat bo'sh 👍")} series={[
            { label: t("Kechikkan hisobot"), color: C.s1 },
            { label: t("Imzo kutayotgan EHF"), color: C.s2 },
            { label: t("Javobsiz xat"), color: C.s3 },
          ]} />
        </Card>
        <Card title={t("Risk darajasi taqsimoti")}>
          <Donut items={(Object.keys(dist) as RiskLevel[]).map((lv) => ({ label: levelLabel(lv, L), value: dist[lv], color: riskColor[lv], href: lv === "past" ? undefined : "/korxonalar/" }))}
            fmt={(v) => t("{n} ta", { n: v })} center={String(cos.filter((c) => c.ball !== null).length)} centerSub={t("korxona")} empty={t("Risk hali hisoblanmagan")} />
        </Card>
      </div>
      <Card title={t("Korxonalar bo'yicha ko'rsatkichlar")} className="mt-5">
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[56rem] text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wide text-ink-500">
              <tr>
                <th className="py-2 pl-5 pr-2 font-medium">{t("Korxona")}</th>
                <th className="px-2 py-2 font-medium">{t("Soliq rejimi")}</th>
                <th className="px-2 py-2 text-right font-medium">{t("Tushum")}</th>
                <th className="px-2 py-2 text-right font-medium">{t("Sof foyda marjasi")}</th>
                <th className="px-2 py-2 text-right font-medium">{t("Soliq yuki")}</th>
                <th className="px-2 py-2 text-right font-medium">{t("Joriy likvidlik")}</th>
                <th className="px-2 py-2 text-right font-medium">{t("Kechikkan hisobot")}</th>
                <th className="py-2 pl-2 pr-5 text-right font-medium">{t("Risk")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {[...per].sort((a, b) => b.tushum - a.tushum).map((p) => {
                const ls = liquidityState(p.likv);
                const ts = taxNormState(p.rejim, p.yuk);
                return (
                  <tr key={p.id} className="hover:bg-ink-50">
                    <td className="py-2 pl-5 pr-2"><Link href={`/korxonalar/${p.id}/`} className="link">{p.nomi}</Link>
                      {p.kap !== null && p.kap < 0 && <span className="ml-2 text-xs font-semibold text-red-700">⚠ {t("kapital manfiy")}</span>}</td>
                    <td className="px-2 py-2 text-ink-700">{t(REJIM[p.rejim])}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{p.has ? money(p.tushum) : "—"}</td>
                    <td className={`px-2 py-2 text-right tabular-nums ${p.marja !== null && p.marja < 0 ? "text-red-700" : ""}`}>{pct(p.marja)}</td>
                    <td className={`whitespace-nowrap px-2 py-2 text-right tabular-nums ${ts === "past" ? "font-medium text-amber-700" : ""}`} title={`${t("me'yor")} ${TAX_NORM[p.rejim].map((x) => `${x * 100}%`).join("–")}`}>{ts === "past" ? "⚠ " : ""}{pct(p.yuk)}</td>
                    <td className={`whitespace-nowrap px-2 py-2 text-right font-medium tabular-nums ${ls === "bad" ? "text-red-700" : ls === "warn" ? "text-amber-700" : "text-ink-900"}`}>{ls && ls !== "ok" ? "⚠ " : ""}{num2(p.likv)}</td>
                    <td className={`px-2 py-2 text-right tabular-nums ${p.late ? "font-semibold text-red-700" : "text-ink-500"}`}>{p.late}</td>
                    <td className="py-2 pl-2 pr-5 text-right">{p.ball === null ? <span className="text-xs text-ink-500">—</span> : <span title={levelLabel(levelOf(p.ball), L)} className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ring-1 ring-inset ${LEVEL_STYLE[levelOf(p.ball)].badge}`}>{p.ball} · {levelLabel(levelOf(p.ball), L)}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-4 text-xs text-ink-500">{t("Oqim ko'rsatkichlari (tushum, foyda, soliq) davr choraklari yig'indisi; balans ko'rsatkichlari (likvidlik, qarzlar) davrning oxirgi choragi bo'yicha. Soliq yuki me'yori taxminiy: QQS 3–8%, soddalashtirilgan 3–5%, aylanma 1–4%.")}</p>
    </>
  );
}
