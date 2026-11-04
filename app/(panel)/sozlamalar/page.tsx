import { requireAdmin } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db, setting } from "@/lib/db";
import { taxTypes } from "@/lib/data";
import { dateUz, som } from "@/lib/format";
import { TURNOVER_LIMIT_BHM } from "@/lib/risk";
import { AddBox, Card, Field, Notice, PageTitle, Select, Table } from "@/components/ui";
import { addTaxType, saveCalendarDay, saveSettings, saveTaxType } from "../actions";

export const dynamic = "force-dynamic";
const DAVR: Record<string, string> = { oy: "Oylik", chorak: "Choraklik", yil: "Yillik" };

export default async function Settings({ searchParams }: { searchParams: Promise<{ ok?: string; xato?: string }> }) {
  await requireAdmin();
  const t = await getT();
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
              hint={t("Aylanma chegarasi: {a} BHM = {b} so'm. Har yili avgustda yangilang.", { a: TURNOVER_LIMIT_BHM.toLocaleString("ru-RU"), b: som(TURNOVER_LIMIT_BHM * Number(bhm)) })} />
            <Field label="Telegram eslatma soati (Toshkent)" name="eslatma_soati" type="number" defaultValue={soat} />
            <div><button className="btn">{t("Saqlash")}</button></div>
          </form>
        </Card>
        <Card title="Integratsiyalar">
          <ul className="space-y-3 text-sm">
            <li><b>Soliq Monitor API:</b> {monitor ? <span className="text-emerald-700">{t("yoqilgan")}</span> : <span className="text-amber-700">{t("MONITOR_KEY o'rnatilmagan")}</span>}
              <p className="text-xs text-ink-500">{t("Monitor dasturi POST /api/monitor manziliga xatlar, EHF, ijara, bojxona va ishchilar ma'lumotini yuboradi (README'da format).")}</p></li>
            <li><b>Telegram bot:</b> {process.env.TELEGRAM_BOT_TOKEN ? <span className="text-emerald-700">{t("ulangan")}</span> : <span className="text-amber-700">{t("TELEGRAM_BOT_TOKEN yo'q")}</span>}
              <p className="text-xs text-ink-500">{t("Xodimlar Profil sahifasidagi kod orqali ulanadi va har kuni o'z korxonalari bo'yicha xulosa oladi.")}</p></li>
          </ul>
        </Card>
      </div>

      {(["soliq", "statistika"] as const).map((g) => (
        <Card key={g} title={g === "soliq" ? "Soliq turlari va muddatlari" : "Statistika hisobotlari va muddatlari"} className="mt-6">
          <p className="mb-3 text-xs text-ink-500">
            {g === "soliq"
              ? t("Muddat = davr tugagan oydan keyin «oy siljishi» oyning «kun»i. Masalan QQS: 1 oy, 20-kun → oktabr uchun 20-noyabr. O'zgarishlar ochiq hisobotlarga darhol qo'llanadi. Standart qiymatlar taxminiy — joriy Soliq kodeksi bo'yicha tekshiring.")
              : t("2026 yil shakllari (stat.uz). Muddatlar taxminiy: stat.uz har oy e'lon qiladigan jadval bilan solishtiring. Ro'yxatda yo'q shaklni pastdan qo'shing. Har bir korxonaga kerakli shakllar korxona sahifasida belgilanadi.")}
          </p>
          <Table head={["Nomi", "Davr", "Oy siljishi", "Kun", ""]}>
            {types.filter((x) => (x.turi ?? "soliq") === g).map((x) => (
              <tr key={x.code}>
                <td colSpan={5} className="!p-0">
                  <form action={saveTaxType} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-3 px-5 py-2">
                    <input type="hidden" name="code" value={x.code} />
                    <div>
                      <input name="nomi" defaultValue={x.nomi} className="input" aria-label={t("Nomi")} />
                      {x.izoh && <p className="mt-1 text-xs text-ink-500">{t(x.izoh)}</p>}
                    </div>
                    <span className="text-sm text-ink-700">{t(DAVR[x.davr])}</span>
                    <input name="oy_offset" type="number" min={0} max={12} defaultValue={x.oy_offset} className="input" aria-label={t("Oy siljishi")} />
                    <input name="kun" type="number" min={1} max={31} defaultValue={x.kun} className="input" aria-label={t("Kun")} />
                    <button className="btn-sm">{t("Saqlash")}</button>
                  </form>
                </td>
              </tr>
            ))}
          </Table>
          <div className="mt-4">
            <AddBox title={g === "soliq" ? "Yangi soliq turi qo'shish" : "Yangi statistika shakli qo'shish"}>
              <form action={addTaxType} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <input type="hidden" name="turi" value={g} />
                <Field label="Nomi" name="nomi" required placeholder={g === "soliq" ? "Suv resurslari solig'i" : "1-invest (yillik)"} />
                <Select label="Davr" name="davr" options={[["oy", "Oylik"], ["chorak", "Choraklik"], ["yil", "Yillik"]]} />
                <Field label="Oy siljishi" name="oy_offset" type="number" defaultValue={1} required />
                <Field label="Kun" name="kun" type="number" defaultValue={5} required />
                <Field label="Kim topshiradi (izoh)" name="izoh" />
                <div className="self-end"><button className="btn">{t("Qo'shish")}</button></div>
              </form>
            </AddBox>
          </div>
        </Card>
      ))}

      <Card title="Ish kunlari kalendari" className="mt-6">
        <div id="kalendar" />
        <form action={saveCalendarDay} className="mb-4 grid gap-3 sm:grid-cols-4">
          <Field label="Sana" name="sana" type="date" required />
          <Select label="Turi" name="tur" options={[["bayram", "Bayram"], ["dam", "Qo'shimcha dam olish"], ["ish", "Ish kuni (ko'chirilgan)"], ["ochirish", "— o'chirish —"]]} />
          <Field label="Nomi" name="nomi" placeholder="Mustaqillik kuni" />
          <div className="self-end"><button className="btn">{t("Saqlash")}</button></div>
        </form>
        <Table head={["Sana", "Turi", "Nomi"]} empty="Bayramlar kiritilmagan — muddatlar faqat shanba/yakshanbani hisobga oladi">
          {days.map((d) => <tr key={d.sana}><td>{dateUz(d.sana)}</td><td>{t(d.tur)}</td><td>{d.nomi}</td></tr>)}
        </Table>
      </Card>
    </>
  );
}
