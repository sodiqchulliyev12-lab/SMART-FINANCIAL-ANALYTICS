import { saveCompany } from "@/app/(panel)/actions";
import { Field, Select } from "@/components/ui";
import { REGIMES } from "@/lib/tax-calendar";
import type { CompanyRow } from "@/lib/data";

export function CompanyForm({ c, staff }: { c?: CompanyRow | null; staff: { id: number; fio: string }[] }) {
  return (
    <form action={saveCompany} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Field label="Korxona nomi" name="nomi" defaultValue={c?.nomi} required placeholder="«Namuna» MChJ" />
      <Field label="STIR" name="stir" defaultValue={c?.stir} required placeholder="9 xonali" />
      <Select label="Soliq rejimi" name="rejim" defaultValue={c?.rejim ?? "qqs"} options={Object.entries(REGIMES)} />
      <Field label="Faoliyat turi" name="faoliyat" defaultValue={c?.faoliyat} placeholder="Ulgurji savdo" />
      <Field label="Direktor" name="direktor" defaultValue={c?.direktor} />
      <Field label="Telefon" name="telefon" defaultValue={c?.telefon} placeholder="+998 90 123 45 67" />
      <Field label="Bank" name="bank" defaultValue={c?.bank} />
      <Field label="Hisob raqam" name="hisob_raqam" defaultValue={c?.hisob_raqam} />
      <Select label="Mas'ul xodim" name="masul_id" defaultValue={c?.masul_id ? String(c.masul_id) : ""} options={[["", "— tanlanmagan —"], ...staff.map((s) => [String(s.id), s.fio] as [string, string])]} />
      <div className="sm:col-span-2 lg:col-span-3">
        <label className="label" htmlFor="izoh">Izoh</label>
        <textarea id="izoh" name="izoh" className="input" rows={2} defaultValue={c?.izoh} />
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <button className="btn">{c ? "Saqlash" : "Qo'shish"}</button>
        {!c && <span className="ml-3 text-xs text-ink-500">Rejimga mos soliq turlari va muddatlari avtomatik yaratiladi.</span>}
      </div>
    </form>
  );
}
