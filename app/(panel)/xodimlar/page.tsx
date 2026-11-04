import { requireAdmin } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { AddBox, Card, Field, Notice, PageTitle, Pill, Select, Table } from "@/components/ui";
import { saveUser, toggleUser } from "../actions";

export const dynamic = "force-dynamic";

export default async function Staff({ searchParams }: { searchParams: Promise<{ ok?: string; xato?: string }> }) {
  const me = await requireAdmin();
  const t = await getT();
  const sp = await searchParams;
  const rows = await db()`SELECT u.*, (SELECT count(*)::int FROM companies c WHERE c.masul_id = u.id AND NOT c.arxiv) AS korxonalar FROM users u ORDER BY u.active DESC, u.fio`;
  return (
    <>
      <PageTitle title="Xodimlar" sub="Xodim faqat o'ziga biriktirilgan korxonalarni ko'radi. Rahbariyat — hammasini." />
      {sp.ok && <Notice>{sp.ok}</Notice>}
      {sp.xato && <Notice kind="err">{sp.xato}</Notice>}
      <AddBox title="Yangi xodim">
        <form action={saveUser} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="F.I.Sh." name="fio" required />
          <Field label="Login" name="login" required hint="Lotin harf, raqam, nuqta" />
          <Field label="Boshlang'ich parol" name="parol" type="password" required hint="Kamida 8 belgi, harf va raqam" />
          <Field label="Lavozim" name="lavozim" placeholder="Buxgalter" />
          <Select label="Rol" name="role" options={[["staff", "Xodim"], ["admin", "Rahbariyat"]]} />
          <div className="self-end"><button className="btn">{t("Qo'shish")}</button></div>
        </form>
      </AddBox>
      <Card>
        <Table head={["Xodim", "Login", "Rol", "Korxonalar", "Telegram", "Amal"]}>
          {rows.map((u) => (
            <tr key={u.id} className={u.active ? "" : "opacity-50"}>
              <td>{u.fio}<div className="text-xs text-ink-500">{u.lavozim}</div></td>
              <td className="font-mono text-xs">{u.login}</td>
              <td><Pill tone={u.role === "admin" ? "info" : "plain"}>{t(u.role === "admin" ? "Rahbariyat" : "Xodim")}</Pill></td>
              <td className="tabular-nums">{u.korxonalar}</td>
              <td>{u.tg_chat_id ? <Pill tone="good">ulangan</Pill> : <span className="text-xs text-ink-500">{t("yo'q")}</span>}</td>
              <td>
                <details>
                  <summary className="btn-sm cursor-pointer list-none">{t("Tahrirlash")}</summary>
                  <form action={saveUser} className="mt-2 grid w-72 gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    <input name="fio" defaultValue={u.fio} className="input" aria-label={t("F.I.Sh.")} required />
                    <input name="login" defaultValue={u.login} className="input" aria-label="Login" required />
                    <input name="lavozim" defaultValue={u.lavozim} className="input" aria-label={t("Lavozim")} placeholder={t("Lavozim")} />
                    <select name="role" defaultValue={u.role} className="input" aria-label={t("Rol")}><option value="staff">{t("Xodim")}</option><option value="admin">{t("Rahbariyat")}</option></select>
                    <input name="parol" type="password" className="input" placeholder={t("Yangi parol (ixtiyoriy)")} aria-label={t("Yangi parol")} />
                    <button className="btn">{t("Saqlash")}</button>
                  </form>
                  {u.id !== me.id && (
                    <form action={toggleUser} className="mt-2"><input type="hidden" name="id" value={u.id} /><button className="btn-sm">{t(u.active ? "Bloklash" : "Faollashtirish")}</button></form>
                  )}
                </details>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
