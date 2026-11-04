import Link from "next/link";
import { getT } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dateUz } from "@/lib/format";
import { companyOptions, scopeSql } from "@/lib/scope";
import { iso, todayTashkent } from "@/lib/tax-calendar";
import { AddBox, Card, Field, Notice, PageTitle, Pill, Select, Table } from "@/components/ui";
import { addLetter, setLetterStatus } from "../actions";

export const dynamic = "force-dynamic";
const TURLAR = ["Talabnoma", "Xabarnoma", "Qaror", "Elektron ogohlantirish", "So'rovnoma", "Boshqa"];
const HOLAT: Record<string, string> = { yangi: "Javob kutilmoqda", javob_berildi: "Javob berildi", yopildi: "Yopildi" };

export default async function Letters({ searchParams }: { searchParams: Promise<{ hammasi?: string; ok?: string; xato?: string }> }) {
  const u = await requireUser();
  const t = await getT();
  const sp = await searchParams;
  const all = sp.hammasi === "1";
  const sql = db();
  const today = iso(todayTashkent());
  const [rows, opts] = await Promise.all([
    sql`SELECT l.*, to_char(l.sana,'YYYY-MM-DD') AS sana_s, to_char(l.javob_muddati,'YYYY-MM-DD') AS jm, c.nomi AS korxona
        FROM letters l JOIN companies c ON c.id = l.company_id
        WHERE TRUE ${all ? sql`` : sql`AND l.holati = 'yangi'`} ${scopeSql(u)}
        ORDER BY (l.holati = 'yangi') DESC, l.javob_muddati NULLS LAST, l.sana DESC LIMIT 300`,
    companyOptions(u),
  ]);
  return (
    <>
      <PageTitle title="Soliq xatlari" sub="my.soliq.uz kabinetidagi talabnoma, xabarnoma va qarorlar. Monitor ulansa, avtomatik tushadi."
        right={<Link href={all ? "/xatlar/" : "/xatlar/?hammasi=1"} className="btn-ghost">{t(all ? "Faqat ochiqlar" : "Hammasi")}</Link>} />
      {sp.ok && <Notice>{sp.ok}</Notice>}
      {sp.xato && <Notice kind="err">{sp.xato}</Notice>}
      {opts.length > 0 && (
        <AddBox title="Xatni ro'yxatga olish">
          <form action={addLetter} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select label="Korxona" name="company_id" options={opts} required />
            <Select label="Turi" name="tur" options={TURLAR.map((x) => [x, x])} />
            <Field label="Raqami" name="raqam" required />
            <Field label="Sanasi" name="sana" type="date" defaultValue={today} required />
            <Field label="Javob muddati" name="javob_muddati" type="date" />
            <Field label="Qisqa mazmuni" name="mazmun" />
            <div><button className="btn">{t("Saqlash")}</button></div>
          </form>
        </AddBox>
      )}
      <Card>
        <Table head={["Korxona", "Xat", "Sana", "Javob muddati", "Holat"]}>
          {rows.map((l) => {
            const late = l.holati === "yangi" && l.jm && l.jm < today;
            return (
              <tr key={l.id}>
                <td><Link href={`/korxonalar/${l.company_id}/`} className="link">{l.korxona}</Link></td>
                <td><b className="font-medium">{t(l.tur)}</b> №{l.raqam}{l.mazmun && <div className="text-xs text-ink-500">{l.mazmun}</div>}{l.manba === "monitor" && <Pill tone="info">avto</Pill>}</td>
                <td>{dateUz(l.sana_s)}</td>
                <td>{l.jm ? <Pill tone={late ? "bad" : l.holati === "yangi" ? "warn" : "plain"}>{dateUz(l.jm)}</Pill> : "—"}</td>
                <td>
                  <form action={setLetterStatus} className="flex items-center gap-1">
                    <input type="hidden" name="id" value={l.id} />
                    <select name="holati" defaultValue={l.holati} className="input w-auto py-1 text-xs" aria-label={t("Holat")}>
                      {Object.entries(HOLAT).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}
                    </select>
                    <button className="btn-sm">OK</button>
                  </form>
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </>
  );
}
