import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, PageTitle, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Journal({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q } = await searchParams;
  const sql = db();
  const like = q?.trim() ? `%${q.trim()}%` : null;
  const rows = await sql`SELECT a.id, to_char(a.vaqt AT TIME ZONE 'Asia/Tashkent','DD.MM.YYYY HH24:MI') AS vaqt, a.amal, a.obyekt, a.tafsilot, u.fio
    FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
    ${like ? sql`WHERE a.amal ILIKE ${like} OR a.obyekt ILIKE ${like} OR u.fio ILIKE ${like}` : sql``}
    ORDER BY a.id DESC LIMIT 300`;
  return (
    <>
      <PageTitle title="Jurnal" sub="Kim, qachon, nimani o'zgartirdi (oxirgi 300 ta yozuv)" />
      <Card>
        <form className="mb-4 flex gap-2"><input name="q" defaultValue={q} className="input max-w-sm" placeholder="Qidirish" aria-label="Qidirish" /><button className="btn-ghost border border-ink-300">Qidirish</button></form>
        <Table head={["Vaqt", "Xodim", "Amal", "Obyekt", "Tafsilot"]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="whitespace-nowrap tabular-nums">{r.vaqt}</td>
              <td>{r.fio ?? "tizim"}</td>
              <td>{r.amal}</td>
              <td className="font-mono text-xs">{r.obyekt}</td>
              <td className="max-w-md truncate font-mono text-xs text-ink-500" title={r.tafsilot ? JSON.stringify(r.tafsilot) : ""}>{r.tafsilot ? JSON.stringify(r.tafsilot) : ""}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
