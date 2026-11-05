import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dateUz } from "@/lib/format";
import { getT } from "@/lib/i18n";
import { companyOptions, scopeSql } from "@/lib/scope";
import { addDays, iso, monthName, periodHuman, todayTashkent } from "@/lib/tax-calendar";
import { Card, Notice, PageTitle, Pill, Stat, Table } from "@/components/ui";
import { FilterBar } from "@/components/FilterBar";
import { markDeadline } from "../actions";

export const dynamic = "force-dynamic";

const FILTERS = {
  yaqin: "Kutilmoqda",
  kechikkan: "Kechikkanlar",
  tolov: "To'lanmaganlar",
  statistika: "Statistika",
  topshirilgan: "Topshirilganlar",
  hammasi: "Hammasi",
} as const;
type F = keyof typeof FILTERS;

type Sp = { f?: string; y?: string; m?: string; k?: string; q?: string; ok?: string; xato?: string };

export default async function Deadlines({ searchParams }: { searchParams: Promise<Sp> }) {
  const u = await requireUser();
  const t = await getT();
  const sp = await searchParams;
  const f: F = sp.f && sp.f in FILTERS ? (sp.f as F) : "yaqin";
  const now = todayTashkent();
  const today = iso(now);
  const year = /^\d{4}$/.test(sp.y ?? "") ? Number(sp.y) : null;
  const month = year && /^(1[0-2]|[1-9])$/.test(sp.m ?? "") ? Number(sp.m) : null;
  const opts = await companyOptions(u);
  const k = opts.some(([id]) => id === sp.k) ? Number(sp.k) : null;
  const qs = (sp.q ?? "").trim().slice(0, 100);
  const sql = db();

  // Davr: yil/oy tanlansa — o'sha davrga tushgan muddatlar; aks holda holatga mos «yaqin» oyna
  let from: string;
  let to: string;
  if (year) {
    from = month ? `${year}-${String(month).padStart(2, "0")}-01` : `${year}-01-01`;
    to = month ? iso(addDays(new Date(Date.UTC(year, month, 1)), -1)) : `${year}-12-31`;
  } else if (f === "topshirilgan") {
    from = iso(addDays(now, -60));
    to = iso(addDays(now, 60));
  } else if (f === "kechikkan") {
    from = "2000-01-01";
    to = today;
  } else {
    from = f === "hammasi" ? iso(addDays(now, -30)) : "2000-01-01";
    to = iso(addDays(now, f === "statistika" ? 45 : 30));
  }
  const status = {
    yaqin: sql`d.hisobot_holati = 'kutilmoqda'`,
    kechikkan: sql`d.hisobot_holati = 'kutilmoqda' AND d.muddat < ${today}`,
    tolov: sql`d.tolov_holati = 'kutilmoqda'`,
    statistika: sql`t.turi = 'statistika'`,
    topshirilgan: sql`d.hisobot_holati = 'topshirildi'`,
    hammasi: sql`TRUE`,
  }[f];
  const base = sql`FROM deadlines d JOIN tax_types t ON t.code = d.soliq JOIN companies c ON c.id = d.company_id
    WHERE d.muddat BETWEEN ${from} AND ${to} ${k ? sql`AND c.id = ${k}` : sql``} ${qs ? sql`AND (c.nomi ILIKE ${`%${qs}%`} OR c.stir LIKE ${`${qs.replace(/\D/g, "") || "-"}%`})` : sql``} ${scopeSql(u)}`;
  const [rows, [sum]] = await Promise.all([
    sql`SELECT d.id, d.davr, to_char(d.muddat,'YYYY-MM-DD') AS muddat, d.hisobot_holati, d.tolov_holati, t.nomi AS soliq, t.turi, c.nomi AS korxona, c.id AS cid
        ${base} AND ${status} ORDER BY d.muddat, c.nomi LIMIT 1000`,
    sql`SELECT count(*)::int AS jami,
               count(*) FILTER (WHERE d.hisobot_holati = 'topshirildi')::int AS topshirildi,
               count(*) FILTER (WHERE d.hisobot_holati = 'kutilmoqda' AND d.muddat >= ${today})::int AS kutilmoqda,
               count(*) FILTER (WHERE d.hisobot_holati = 'kutilmoqda' AND d.muddat < ${today})::int AS kechikkan
        ${base}`,
  ]);

  const q = (over: Partial<Record<"f" | "y" | "m" | "k" | "q", string | number | null>>) => {
    const p = new URLSearchParams();
    const v = { f, y: year, m: month, k, q: qs || null, ...over };
    for (const [key, val] of Object.entries(v)) if (val !== null && val !== undefined && val !== "" && !(key === "f" && val === "yaqin")) p.set(key, String(val));
    const s = p.toString();
    return `/muddatlar/${s ? `?${s}` : ""}`;
  };
  const back = q({});
  const years = [now.getUTCFullYear() - 1, now.getUTCFullYear(), now.getUTCFullYear() + 1];
  const periodLabel = year
    ? month ? `${monthName(month - 1, t.lang)} ${year}` : t("{y} yil", { y: year })
    : f === "kechikkan" ? t("Barcha kechikkanlar") : f === "topshirilgan" ? t("Oxirgi 60 kun") : t("Yaqin 30 kun");
  const selName = k ? opts.find(([id]) => Number(id) === k)?.[1] : null;

  return (
    <>
      <PageTitle section title="Hisobot va to'lov muddatlari" sub="Soliq va statistika hisobotlari. Muddatlar har kuni avtomatik yaratiladi; dam olish va bayram kunlari keyingi ish kuniga suriladi." />
      {sp.ok && <Notice>{sp.ok}</Notice>}
      {sp.xato && <Notice kind="err">{sp.xato}</Notice>}

      <FilterBar q={qs} hidden={{ f: f === "yaqin" ? null : f }} active={(year ? 1 : 0) + (month ? 1 : 0) + (k ? 1 : 0)} clearHref={q({ y: null, m: null, k: null, q: null })}>
        <div>
          <label className="label" htmlFor="y">{t("Yil")}</label>
          <select id="y" name="y" defaultValue={year ?? ""} className="input">
            <option value="">{t("Yaqin muddatlar")}</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="m">{t("Oy")}</label>
          <select id="m" name="m" defaultValue={month ?? ""} className="input">
            <option value="">{t("Butun yil")}</option>
            {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{monthName(i, t.lang)}</option>)}
          </select>
          <p className="mt-1 text-[11px] text-ink-500">{t("Oy faqat yil tanlanganda ishlaydi.")}</p>
        </div>
        <div>
          <label className="label" htmlFor="k">{t("Korxona")}</label>
          <select id="k" name="k" defaultValue={k ?? ""} className="input">
            <option value="">{t("Barcha korxonalar")}</option>
            {opts.map(([id, nomi]) => <option key={id} value={id}>{nomi}</option>)}
          </select>
        </div>
      </FilterBar>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Jami muddatlar" value={sum.jami} hint={periodLabel} />
        <Stat label="Topshirilgan" value={sum.topshirildi} tone="good" />
        <Stat label="Kutilmoqda" value={sum.kutilmoqda} tone={sum.kutilmoqda ? "warn" : "plain"} />
        <Stat label="Kechikkan" value={sum.kechikkan} tone={sum.kechikkan ? "bad" : "good"} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(FILTERS) as F[]).map((key) => (
          <Link key={key} href={q({ f: key })} aria-current={key === f ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 text-sm ${key === f ? "bg-brand-600 text-white" : "bg-surface text-ink-700 ring-1 ring-ink-300 hover:bg-ink-100"}`}>{t(FILTERS[key])}</Link>
        ))}
      </div>

      <Card title={`${periodLabel}${selName ? ` · ${selName}` : ""} · ${rows.length}`}>
        <Table head={["Muddat", "Korxona", "Hisobot turi", "Davr", "Hisobot", "To'lov"]} empty="Bu davrda muddat yo'q">
          {rows.map((d) => {
            const late = d.hisobot_holati === "kutilmoqda" && d.muddat < today;
            const Btn = ({ field, value, label }: { field: string; value: string; label: string }) => (
              <form action={markDeadline} className="inline">
                <input type="hidden" name="id" value={d.id} /><input type="hidden" name="back" value={back} />
                <input type="hidden" name="field" value={field} /><input type="hidden" name="value" value={value} />
                <button className="btn-sm">{label}</button>
              </form>
            );
            return (
              <tr key={d.id} className={late ? "bg-red-50/50" : ""}>
                <td><Pill tone={late ? "bad" : d.hisobot_holati === "topshirildi" ? "good" : d.muddat === today ? "warn" : "info"}>{dateUz(d.muddat)}</Pill></td>
                <td>{k ? d.korxona : <Link href={q({ k: d.cid })} className="link" title={t("Faqat shu korxona")}>{d.korxona}</Link>}</td>
                <td>{t(d.soliq)}{d.turi === "statistika" && <> <Pill tone="info">stat</Pill></>}</td>
                <td className="text-ink-700">{periodHuman(d.davr, t.lang)}</td>
                <td>{d.hisobot_holati === "topshirildi" ? <Btn field="hisobot_holati" value="kutilmoqda" label={`✓ ${t("topshirilgan")}`} /> : <Btn field="hisobot_holati" value="topshirildi" label={t("Topshirildi")} />}</td>
                <td className="space-x-1 whitespace-nowrap">
                  {d.turi === "statistika" ? <span className="text-xs text-ink-500">{t("to'lovsiz")}</span> : d.tolov_holati === "kutilmoqda" ? (<><Btn field="tolov_holati" value="tolandi" label={t("To'landi")} /><Btn field="tolov_holati" value="yoq" label={t("To'lov yo'q")} /></>)
                    : <Btn field="tolov_holati" value="kutilmoqda" label={d.tolov_holati === "tolandi" ? `✓ ${t("to'langan")}` : `— ${t("to'lov yo'q")}`} />}
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </>
  );
}
