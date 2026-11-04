import { requireAdmin } from "@/lib/auth";
import { db, setting } from "@/lib/db";
import { taxTypes } from "@/lib/data";
import { dateUz, som } from "@/lib/format";
import { TURNOVER_LIMIT_BHM } from "@/lib/risk";
import { Card, Field, Notice, PageTitle, Select, Table } from "@/components/ui";
import { saveCalendarDay, saveSettings, saveTaxType } from "../actions";

export const dynamic = "force-dynamic";
const DAVR: Record<string, string> = { oy: "Oylik", chorak: "Choraklik", yil: "Yillik" };

export default async function Settings({ searchParams }: { searchParams: Promise<{ ok?: string; xato?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const [firma, bhm, soat, types, days] = await Promise.all([
    setting("firma_nomi", "Aqilli Moliya"), setting("bhm", "412000"), setting("eslatma_soati", "9"), taxTypes(),
    db()`SELECT to_char(sana,'YYYY-MM-DD') AS sana, tur, nomi FROM calendar_days WHERE sana >= current_date - 30 ORDER BY sana`,
  ]);
  const monitor = Boolean(process.env.MONITOR_KEY);
  return (
    <>
      <PageTitle title="Sozlamalar" />
      {sp.ok && <Notice>{sp.ok}</Notice>}
      {sp.xato && <Notice kind="err">{sp.xato}</Notice>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Umumiy">
          <form action={saveSettings} className="grid gap-4">
            <Field label="Firma nomi" name="firma_nomi" defaultValue={firma} />
            <Field label="BHM (bazaviy hisoblash miqdori), so'm" name="bhm" defaultValue={bhm} required
              hint={`Aylanma chegarasi: ${TURNOVER_LIMIT_BHM.toLocaleString("ru-RU")} BHM = ${som(TURNOVER_LIMIT_BHM * Number(bhm))} so'm. Har yili avgustda yangilang.`} />
            <Field label="Telegram eslatma soati (Toshkent)" name="eslatma_soati" type="number" defaultValue={soat} />
            <div><button className="btn">Saqlash</button></div>
          </form>
        </Card>
        <Card title="Integratsiyalar">
          <ul className="space-y-3 text-sm">
            <li><b>Soliq Monitor API:</b> {monitor ? <span className="text-emerald-700">yoqilgan</span> : <span className="text-amber-700">MONITOR_KEY o&apos;rnatilmagan</span>}
              <p className="text-xs text-ink-500">Monitor dasturi <code>POST /api/monitor</code> manziliga xatlar, EHF va ijara ma&apos;lumotini yuboradi (README&apos;da format).</p></li>
            <li><b>Telegram bot:</b> {process.env.TELEGRAM_BOT_TOKEN ? <span className="text-emerald-700">ulangan</span> : <span className="text-amber-700">TELEGRAM_BOT_TOKEN yo&apos;q</span>}
              <p className="text-xs text-ink-500">Xodimlar Profil sahifasidagi kod orqali ulanadi va har kuni o&apos;z korxonalari bo&apos;yicha xulosa oladi.</p></li>
          </ul>
        </Card>
      </div>

      <Card title="Soliq turlari va muddatlari" className="mt-6">
        <p className="mb-3 text-xs text-ink-500">Muddat = davr tugagan oydan keyin «oy siljishi» oyning «kun»i. Masalan QQS: 1 oy, 20-kun → oktabr uchun 20-noyabr. O&apos;zgarishlar ochiq hisobotlarga darhol qo&apos;llanadi. Standart qiymatlar taxminiy — joriy Soliq kodeksi bo&apos;yicha tekshiring.</p>
        <Table head={["Soliq", "Davr", "Oy siljishi", "Kun", ""]}>
          {types.map((t) => (
            <tr key={t.code}>
              <td colSpan={5} className="!p-0">
                <form action={saveTaxType} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-3 px-5 py-2">
                  <input type="hidden" name="code" value={t.code} />
                  <input name="nomi" defaultValue={t.nomi} className="input" aria-label="Nomi" />
                  <span className="text-sm text-ink-700">{DAVR[t.davr]}</span>
                  <input name="oy_offset" type="number" min={0} max={12} defaultValue={t.oy_offset} className="input" aria-label="Oy siljishi" />
                  <input name="kun" type="number" min={1} max={31} defaultValue={t.kun} className="input" aria-label="Kun" />
                  <button className="btn-sm">Saqlash</button>
                </form>
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card title="Ish kunlari kalendari" className="mt-6">
        <div id="kalendar" />
        <form action={saveCalendarDay} className="mb-4 grid gap-3 sm:grid-cols-4">
          <Field label="Sana" name="sana" type="date" required />
          <Select label="Turi" name="tur" options={[["bayram", "Bayram"], ["dam", "Qo'shimcha dam olish"], ["ish", "Ish kuni (ko'chirilgan)"], ["ochirish", "— o'chirish —"]]} />
          <Field label="Nomi" name="nomi" placeholder="Mustaqillik kuni" />
          <div className="self-end"><button className="btn">Saqlash</button></div>
        </form>
        <Table head={["Sana", "Turi", "Nomi"]} empty="Bayramlar kiritilmagan — muddatlar faqat shanba/yakshanbani hisobga oladi">
          {days.map((d) => <tr key={d.sana}><td>{dateUz(d.sana)}</td><td>{d.tur}</td><td>{d.nomi}</td></tr>)}
        </Table>
      </Card>
    </>
  );
}
