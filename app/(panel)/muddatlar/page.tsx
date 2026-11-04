import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dateUz } from "@/lib/format";
import { scopeSql } from "@/lib/scope";
import { addDays, iso, periodHuman, todayTashkent } from "@/lib/tax-calendar";
import { Card, Notice, PageTitle, Pill, Table } from "@/components/ui";
import { markDeadline } from "../actions";

export const dynamic = "force-dynamic";

const FILTERS: Record<string, string> = { yaqin: "30 kun ichida", kechikkan: "Kechikkanlar", tolov: "To'lanmaganlar", topshirilgan: "Topshirilganlar" };

export default async function Deadlines({ searchParams }: { searchParams: Promise<{ f?: string; ok?: string; xato?: string }> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const f = (sp.f && sp.f in FILTERS ? sp.f : "yaqin") as "yaqin" | "kechikkan" | "tolov" | "topshirilgan";
  const sql = db();
  const today = iso(todayTashkent());
  const cond = {
    yaqin: sql`d.hisobot_holati = 'kutilmoqda' AND d.muddat <= ${iso(addDays(todayTashkent(), 30))}`,
    kechikkan: sql`d.hisobot_holati = 'kutilmoqda' AND d.muddat < ${today}`,
    tolov: sql`d.tolov_holati = 'kutilmoqda' AND d.muddat <= ${iso(addDays(todayTashkent(), 30))}`,
    topshirilgan: sql`d.hisobot_holati = 'topshirildi' AND d.muddat >= ${iso(addDays(todayTashkent(), -60))}`,
  }[f];
  const rows = await sql`
    SELECT d.id, d.davr, to_char(d.muddat,'YYYY-MM-DD') AS muddat, d.hisobot_holati, d.tolov_holati, t.nomi AS soliq, c.nomi AS korxona, c.id AS cid
    FROM deadlines d JOIN tax_types t ON t.code = d.soliq JOIN companies c ON c.id = d.company_id
    WHERE ${cond} ${scopeSql(u)}
    ORDER BY d.muddat, c.nomi LIMIT 500`;
  const back = `/muddatlar/?f=${f}`;
  return (
    <>
      <PageTitle title="Hisobot va to'lov muddatlari" sub="Muddatlar har kuni avtomatik yaratiladi; dam olish va bayram kunlari keyingi ish kuniga suriladi." />
      {sp.ok && <Notice>{sp.ok}</Notice>}
      {sp.xato && <Notice kind="err">{sp.xato}</Notice>}
      <div className="mb-4 flex flex-wrap gap-2">
        {Object.entries(FILTERS).map(([k, l]) => (
          <Link key={k} href={`/muddatlar/?f=${k}`} className={`rounded-full px-3 py-1.5 text-sm ${k === f ? "bg-brand-600 text-white" : "bg-white text-ink-700 ring-1 ring-ink-300 hover:bg-ink-100"}`}>{l}</Link>
        ))}
      </div>
      <Card>
        <Table head={["Muddat", "Korxona", "Soliq", "Davr", "Hisobot", "To'lov"]}>
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
                <td><Pill tone={late ? "bad" : d.muddat === today ? "warn" : "info"}>{dateUz(d.muddat)}</Pill></td>
                <td><Link href={`/korxonalar/${d.cid}/`} className="link">{d.korxona}</Link></td>
                <td>{d.soliq}</td>
                <td className="text-ink-700">{periodHuman(d.davr)}</td>
                <td>{d.hisobot_holati === "topshirildi" ? <Btn field="hisobot_holati" value="kutilmoqda" label="✓ topshirilgan" /> : <Btn field="hisobot_holati" value="topshirildi" label="Topshirildi" />}</td>
                <td className="space-x-1 whitespace-nowrap">
                  {d.tolov_holati === "kutilmoqda" ? (<><Btn field="tolov_holati" value="tolandi" label="To'landi" /><Btn field="tolov_holati" value="yoq" label="To'lov yo'q" /></>)
                    : <Btn field="tolov_holati" value="kutilmoqda" label={d.tolov_holati === "tolandi" ? "✓ to'langan" : "— to'lov yo'q"} />}
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </>
  );
}
