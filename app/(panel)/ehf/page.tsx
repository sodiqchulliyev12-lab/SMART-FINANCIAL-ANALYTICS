import Link from "next/link";
import { getT } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dateUz, som } from "@/lib/format";
import { companyOptions, scopeSql } from "@/lib/scope";
import { iso, todayTashkent, daysBetween, parseIso } from "@/lib/tax-calendar";
import { AddButton, Card, Field, Notice, PageTitle, Pill, Select, Table } from "@/components/ui";
import { addEhf, setEhfStatus } from "../actions";

export const dynamic = "force-dynamic";

export default async function Ehf({ searchParams }: { searchParams: Promise<{ hammasi?: string; ok?: string; xato?: string }> }) {
  const u = await requireUser();
  const t = await getT();
  const sp = await searchParams;
  const all = sp.hammasi === "1";
  const sql = db();
  const today = todayTashkent();
  const [rows, opts] = await Promise.all([
    sql`SELECT e.*, to_char(e.sana,'YYYY-MM-DD') AS sana_s, c.nomi AS korxona FROM ehf e JOIN companies c ON c.id = e.company_id
        WHERE TRUE ${all ? sql`` : sql`AND e.holati = 'imzo_kutmoqda'`} ${scopeSql(u)} ORDER BY e.xavfli DESC, e.sana LIMIT 300`,
    companyOptions(u),
  ]);
  const St = ({ id, holati, label }: { id: number; holati: string; label: string }) => (
    <form action={setEhfStatus} className="inline"><input type="hidden" name="id" value={id} /><input type="hidden" name="holati" value={holati} /><button className="btn-sm">{t(label)}</button></form>
  );
  return (
    <>
      <PageTitle section title="Elektron hisob-fakturalar" sub="Didox'da imzo kutayotgan fakturalar. 5 kundan uzoq kutgan va xavfli kontragentli fakturalar riskni oshiradi."
        right={<div className="flex items-center gap-2"><Link href={all ? "/ehf/" : "/ehf/?hammasi=1"} className="btn-ghost">{t(all ? "Faqat imzo kutayotganlar" : "Hammasi")}</Link>{opts.length > 0 && (
    <AddButton title="EHF qo'shish">
      <form action={addEhf} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Select label="Korxona" name="company_id" options={opts} required />
        <Field label="Faktura raqami" name="raqam" required />
        <Field label="Sana" name="sana" type="date" defaultValue={iso(today)} required />
        <Field label="Kontragent" name="kontragent" required />
        <Field label="Kontragent STIR" name="kontragent_stir" />
        <Field label="Summa (QQS bilan)" name="summa" required />
        <Select label="Yo'nalish" name="yonalish" options={[["kiruvchi", "Kiruvchi"], ["chiquvchi", "Chiquvchi"]]} />
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="xavfli" /> {t("Kontragent yuqori tavakkalchilikda")}</label>
        <div><button className="btn">{t("Saqlash")}</button></div>
      </form>
    </AddButton>
  )}</div>} />
      {sp.ok && <Notice>{sp.ok}</Notice>}
      {sp.xato && <Notice kind="err">{sp.xato}</Notice>}
      <Card>
        <Table head={["Korxona", "Faktura", "Kontragent", "Summa", "Kutmoqda", "Amal"]} align={["l", "l", "l", "r", "l", "l"]}>
          {rows.map((e) => {
            const wait = daysBetween(parseIso(e.sana_s), today);
            return (
              <tr key={e.id}>
                <td><Link href={`/korxonalar/${e.company_id}/`} className="link">{e.korxona}</Link></td>
                <td>№{e.raqam} <span className="text-xs text-ink-500">{dateUz(e.sana_s)} · {t(e.yonalish)}</span></td>
                <td>{e.kontragent}{e.xavfli && <> <Pill tone="bad">xavfli</Pill></>}{e.kontragent_stir && <div className="text-xs text-ink-500">{e.kontragent_stir}</div>}</td>
                <td className="text-right tabular-nums">{som(e.summa)}</td>
                <td>{e.holati === "imzo_kutmoqda" ? <Pill tone={wait > 5 ? "bad" : "warn"}>{t("{n} kun", { n: wait })}</Pill> : <Pill tone={e.holati === "imzolandi" ? "good" : "plain"}>{t(e.holati === "imzolandi" ? "imzolangan" : "rad etilgan")}</Pill>}</td>
                <td className="space-x-1 whitespace-nowrap">
                  {e.holati === "imzo_kutmoqda" ? <><St id={e.id} holati="imzolandi" label="Imzolandi" /><St id={e.id} holati="rad" label="Rad" /></> : <St id={e.id} holati="imzo_kutmoqda" label="Qaytarish" />}
                  <St id={e.id} holati={e.xavfli ? "xavfsiz" : "xavfli"} label={e.xavfli ? "Xavfsiz" : "Xavfli"} />
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </>
  );
}
