import Link from "next/link";
import { getT } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dateUz, som } from "@/lib/format";
import { TIF_SETTLE_DAYS, tifOpen } from "@/lib/risk";
import { companyOptions, scopeSql } from "@/lib/scope";
import { daysBetween, parseIso, todayTashkent } from "@/lib/tax-calendar";
import { AddBox, Card, Field, Notice, PageTitle, Pill, Select, Table } from "@/components/ui";
import { saveContract, saveCustomsDebt, setContractStatus } from "../actions";

export const dynamic = "force-dynamic";

const SOURCES = [
  ["dep.customs.uz/qarzdor", "bojxona to'lovlari bo'yicha qarzdorlar"],
  ["contract.customs.uz", "tashqi savdo shartnomalari"],
  ["ed2.customs.uz", "bojxona yuk deklaratsiyalari"],
];

export default async function Customs({ searchParams }: { searchParams: Promise<{ ok?: string; xato?: string }> }) {
  const u = await requireUser();
  const t = await getT();
  const sp = await searchParams;
  const sql = db();
  const today = todayTashkent();
  const [debts, contracts, decls, opts] = await Promise.all([
    sql`SELECT d.*, to_char(d.tekshirildi,'YYYY-MM-DD') AS t, c.nomi AS korxona, c.stir FROM customs_debts d JOIN companies c ON c.id = d.company_id
        WHERE TRUE ${scopeSql(u)} ORDER BY d.summa DESC, c.nomi LIMIT 300`,
    sql`SELECT k.*, to_char(k.sana,'YYYY-MM-DD') AS s, to_char(k.ochiq_sana,'YYYY-MM-DD') AS o, to_char(k.tugash,'YYYY-MM-DD') AS t, c.nomi AS korxona
        FROM customs_contracts k JOIN companies c ON c.id = k.company_id
        WHERE TRUE ${scopeSql(u)} ORDER BY (k.holati = 'faol') DESC, k.sana DESC LIMIT 300`,
    sql`SELECT x.*, to_char(x.sana,'YYYY-MM-DD') AS s, c.nomi AS korxona FROM customs_declarations x JOIN companies c ON c.id = x.company_id
        WHERE TRUE ${scopeSql(u)} ORDER BY x.sana DESC LIMIT 100`,
    companyOptions(u),
  ]);
  const withDebt = debts.filter((d) => Number(d.summa) > 0);

  return (
    <>
      <PageTitle title="Bojxona" sub={<>{t("Qarzlar, tashqi savdo shartnomalari va deklaratsiyalar. Manba:")} {SOURCES.map(([s, w], i) => <span key={s}>{i ? ", " : ""}<b className="font-medium">{s}</b> ({t(w)})</span>)}.</>} />
      {sp.ok && <Notice>{sp.ok}</Notice>}
      {sp.xato && <Notice kind="err">{sp.xato}</Notice>}

      <Card title="Bojxona qarzlari" className="mb-6" right={withDebt.length ? <Pill tone="bad">{t("Qarzi bor korxonalar: {n}", { n: withDebt.length })}</Pill> : <Pill tone="good">{t("Qarz yo'q")}</Pill>}>
        {opts.length > 0 && (
          <AddBox title="Qarzni qo'lda kiritish (qarz yo'q bo'lsa 0)">
            <form action={saveCustomsDebt} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Select label="Korxona" name="company_id" options={opts} required />
              <Field label="Qarz, so'm" name="summa" required placeholder="0" />
              <Field label="Izoh" name="tafsilot" placeholder="masalan: boj to'lovi, penya" />
              <div className="self-end"><button className="btn">{t("Saqlash")}</button></div>
            </form>
          </AddBox>
        )}
        <Table head={["Korxona", "Qarz, so'm", "Izoh", "Tekshirilgan"]} align={["l", "r", "l", "l"]} empty="Hali tekshirilmagan">
          {debts.map((d) => (
            <tr key={d.company_id}>
              <td><Link href={`/korxonalar/${d.company_id}/`} className="link">{d.korxona}</Link><div className="text-xs text-ink-500">{t("STIR")} {d.stir}</div></td>
              <td className={`text-right tabular-nums ${Number(d.summa) > 0 ? "font-semibold text-red-600" : "text-emerald-600"}`}>{Number(d.summa) > 0 ? som(d.summa) : "0"}</td>
              <td className="text-ink-700">{d.tafsilot || "—"}</td>
              <td className="whitespace-nowrap text-xs text-ink-500">{dateUz(d.t)} · {t(d.manba === "monitor" ? "avtomatik" : "qo'lda")}</td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card title="Tashqi savdo shartnomalari" className="mb-6">
        <p className="mb-4 text-sm text-ink-500">
          {t("Import uchun to'langan avans tovar bilan, eksport uchun jo'natilgan tovar pul bilan odatda {n} kun ichida qoplanishi kerak. Qoplanmagan qism muddatga yaqinlashganda risk paneli ogohlantiradi.", { n: TIF_SETTLE_DAYS })}
        </p>
        {opts.length > 0 && (
          <AddBox title="Shartnoma qo'shish yoki yangilash">
            <form action={saveContract} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Select label="Korxona" name="company_id" options={opts} required />
              <Field label="Shartnoma raqami" name="raqam" required />
              <Select label="Turi" name="turi" options={[["import", "Import"], ["eksport", "Eksport"]]} />
              <Field label="Kontragent" name="kontragent" />
              <Field label="Davlat" name="davlat" />
              <Field label="Valyuta" name="valyuta" defaultValue="USD" />
              <Field label="Shartnoma summasi" name="summa" />
              <Field label="To'langan / tushgan pul" name="tolangan" hint="Import: chetga to'langan. Eksport: hisobga tushgan." />
              <Field label="Kelgan / jo'natilgan tovar" name="yetkazilgan" hint="Bojxona deklaratsiyalari bo'yicha qiymat" />
              <Field label="Qoplanmagan qism sanasi" name="ochiq_sana" type="date" hint="Avans to'langan yoki tovar jo'natilgan kun" />
              <Field label="Shartnoma sanasi" name="sana" type="date" required />
              <Field label="Amal qilish muddati" name="tugash" type="date" />
              <div className="self-end"><button className="btn">{t("Saqlash")}</button></div>
            </form>
          </AddBox>
        )}
        <Table head={["Korxona", "Shartnoma", "Summa", "Qoplanmagan", "Muddat", "Holat"]} align={["l", "l", "r", "r", "l", "l"]}>
          {contracts.map((k) => {
            const open = tifOpen({ turi: k.turi, tolangan: Number(k.tolangan), yetkazilgan: Number(k.yetkazilgan) });
            const age = daysBetween(parseIso(k.o ?? k.s), today);
            const left = TIF_SETTLE_DAYS - age;
            return (
              <tr key={k.id}>
                <td><Link href={`/korxonalar/${k.company_id}/`} className="link">{k.korxona}</Link></td>
                <td>
                  №{k.raqam} <Pill tone={k.turi === "eksport" ? "info" : "plain"}>{k.turi}</Pill>
                  <div className="text-xs text-ink-500">{[k.kontragent, k.davlat].filter(Boolean).join(", ") || "—"} · {dateUz(k.s)}</div>
                </td>
                <td className="text-right tabular-nums">{som(k.summa)} {k.valyuta}</td>
                <td className="text-right tabular-nums">
                  {open > 0 ? <>{som(open)} {k.valyuta}<div className="text-xs text-ink-500">{t(k.turi === "eksport" ? "pul kelmagan" : "tovar kelmagan")}</div></> : <span className="text-emerald-600">0</span>}
                </td>
                <td className="whitespace-nowrap">
                  {k.holati === "faol" && open > 0
                    ? <Pill tone={left < 0 ? "bad" : left <= 30 ? "warn" : "good"}>{left < 0 ? t("{n} kun o'tdi", { n: -left }) : t("{n} kun qoldi", { n: left })}</Pill>
                    : k.t ? <span className="text-xs text-ink-500">{t("{d} gacha", { d: dateUz(k.t) })}</span> : "—"}
                </td>
                <td>
                  <form action={setContractStatus} className="flex items-center gap-1">
                    <input type="hidden" name="id" value={k.id} />
                    <select name="holati" defaultValue={k.holati} className="input w-auto py-1 text-xs" aria-label={t("Holat")}>
                      <option value="faol">{t("Faol")}</option><option value="yopilgan">{t("Yopilgan")}</option><option value="bekor">{t("Bekor qilingan")}</option>
                    </select>
                    <button className="btn-sm">OK</button>
                  </form>
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>

      <Card title="Bojxona yuk deklaratsiyalari (oxirgi 100 ta)">
        <Table head={["Korxona", "Deklaratsiya", "Rejim", "Qiymat", "Bojxona to'lovi, so'm", "Holat"]} align={["l", "l", "l", "r", "r", "l"]} empty="Deklaratsiyalar Soliq Monitor orqali avtomatik tushadi">
          {decls.map((x) => (
            <tr key={x.id}>
              <td><Link href={`/korxonalar/${x.company_id}/`} className="link">{x.korxona}</Link></td>
              <td>№{x.raqam}<div className="text-xs text-ink-500">{dateUz(x.s)}{x.shartnoma && ` · ${t("shartnoma")} №${x.shartnoma}`}</div></td>
              <td>{x.rejim || "—"} <span className="text-xs text-ink-500">{t(x.turi)}</span></td>
              <td className="text-right tabular-nums">{som(x.summa)} {x.valyuta}</td>
              <td className="text-right tabular-nums">{som(x.boj_tolov)}</td>
              <td><Pill tone={/rad|bekor/i.test(x.holati) ? "bad" : /jarayon|kutil/i.test(x.holati) ? "warn" : "good"}>{x.holati}</Pill></td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
