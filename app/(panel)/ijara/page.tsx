import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dateUz } from "@/lib/format";
import { companyOptions, scopeSql } from "@/lib/scope";
import { daysBetween, parseIso, todayTashkent } from "@/lib/tax-calendar";
import { AddBox, Card, Field, Notice, PageTitle, Pill, Select, Table } from "@/components/ui";
import { addLease, setLeaseStatus } from "../actions";

export const dynamic = "force-dynamic";

export default async function Leases({ searchParams }: { searchParams: Promise<{ ok?: string; xato?: string }> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const sql = db();
  const today = todayTashkent();
  const [rows, opts] = await Promise.all([
    sql`SELECT l.*, to_char(l.boshlanish,'YYYY-MM-DD') AS b, to_char(l.tugash,'YYYY-MM-DD') AS t, c.nomi AS korxona FROM leases l JOIN companies c ON c.id = l.company_id
        WHERE TRUE ${scopeSql(u)} ORDER BY (l.holati = 'faol') DESC, l.tugash LIMIT 300`,
    companyOptions(u),
  ]);
  return (
    <>
      <PageTitle title="Ijara shartnomalari" sub="ijara.soliq.uz'dagi shartnomalar. Tugashiga 30 kun qolganda va tugagach risk paneli ogohlantiradi." />
      {sp.ok && <Notice>{sp.ok}</Notice>}
      {sp.xato && <Notice kind="err">{sp.xato}</Notice>}
      {opts.length > 0 && (
        <AddBox title="Shartnoma qo'shish">
          <form action={addLease} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select label="Korxona" name="company_id" options={opts} required />
            <Field label="Shartnoma raqami" name="raqam" required />
            <Field label="Ikkinchi tomon" name="tomon" />
            <Field label="Boshlanish" name="boshlanish" type="date" required />
            <Field label="Tugash" name="tugash" type="date" required />
            <div className="self-end"><button className="btn">Saqlash</button></div>
          </form>
        </AddBox>
      )}
      <Card>
        <Table head={["Korxona", "Shartnoma", "Muddat", "Qoldi", "Holat"]}>
          {rows.map((l) => {
            const left = daysBetween(today, parseIso(l.t));
            return (
              <tr key={l.id}>
                <td><Link href={`/korxonalar/${l.company_id}/`} className="link">{l.korxona}</Link></td>
                <td>№{l.raqam}{l.tomon && <div className="text-xs text-ink-500">{l.tomon}</div>}</td>
                <td className="whitespace-nowrap">{dateUz(l.b)} — {dateUz(l.t)}</td>
                <td>{l.holati === "faol" ? <Pill tone={left < 0 ? "bad" : left <= 30 ? "warn" : "good"}>{left < 0 ? `${-left} kun o'tdi` : `${left} kun`}</Pill> : "—"}</td>
                <td>
                  <form action={setLeaseStatus} className="flex items-center gap-1">
                    <input type="hidden" name="id" value={l.id} />
                    <select name="holati" defaultValue={l.holati} className="input w-auto py-1 text-xs" aria-label="Holat">
                      <option value="faol">Faol</option><option value="tugagan">Tugagan</option><option value="bekor">Bekor qilingan</option>
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
