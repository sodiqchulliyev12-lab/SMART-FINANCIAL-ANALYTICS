import Link from "next/link";
import { companyScope, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { listCompanies } from "@/lib/data";
import { REGIMES } from "@/lib/tax-calendar";
import { AddBox, Card, Notice, PageTitle, Pill, RiskBadge, Table } from "@/components/ui";
import { CompanyForm } from "@/components/CompanyForm";

export const dynamic = "force-dynamic";

export default async function Companies({ searchParams }: { searchParams: Promise<{ q?: string; arxiv?: string; ok?: string; xato?: string }> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const arxiv = sp.arxiv === "1";
  const list = await listCompanies(companyScope(u), { arxiv, q: sp.q });
  const staff = u.role === "admin" ? await db()<{ id: number; fio: string }[]>`SELECT id, fio FROM users WHERE active ORDER BY fio` : [];
  return (
    <>
      <PageTitle title="Korxonalar" sub={`${list.length} ta ${arxiv ? "arxivdagi" : "faol"} korxona, risk bo'yicha saralangan`}
        right={<Link href={arxiv ? "/korxonalar/" : "/korxonalar/?arxiv=1"} className="btn-ghost">{arxiv ? "← Faollar" : "Arxiv"}</Link>} />
      {sp.ok && <Notice>{sp.ok}</Notice>}
      {sp.xato && <Notice kind="err">{sp.xato}</Notice>}
      {u.role === "admin" && !arxiv && <AddBox title="Yangi korxona" open={Boolean(sp.xato)}><CompanyForm staff={staff} /></AddBox>}
      <Card>
        <form className="mb-4 flex gap-2">
          {arxiv && <input type="hidden" name="arxiv" value="1" />}
          <input name="q" defaultValue={sp.q} className="input max-w-sm" placeholder="Nomi yoki STIR bo'yicha qidirish" aria-label="Qidirish" />
          <button className="btn-ghost border border-ink-300">Qidirish</button>
        </form>
        <Table head={["Korxona", "STIR", "Rejim", "Mas'ul", "Risk"]}>
          {list.map((c) => (
            <tr key={c.id}>
              <td><Link href={`/korxonalar/${c.id}/`} className="link">{c.nomi}</Link>{c.faoliyat && <div className="text-xs text-ink-500">{c.faoliyat}</div>}</td>
              <td className="tabular-nums">{c.stir}</td>
              <td><Pill>{REGIMES[c.rejim] ?? c.rejim}</Pill></td>
              <td>{c.masul ?? <span className="text-ink-500">—</span>}</td>
              <td><RiskBadge score={c.ball} /></td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
