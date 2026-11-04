import { requireUser } from "@/lib/auth";
import { Card, Field, Notice, PageTitle } from "@/components/ui";
import { changePassword, telegramCode, unlinkTelegram } from "../actions";

export const dynamic = "force-dynamic";

export default async function Profile({ searchParams }: { searchParams: Promise<{ ok?: string; xato?: string }> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const bot = process.env.TELEGRAM_BOT_USERNAME;
  return (
    <>
      <PageTitle title="Profil" sub={`${u.fio} · ${u.login}`} />
      {sp.ok && <Notice>{sp.ok}</Notice>}
      {sp.xato && <Notice kind="err">{sp.xato}</Notice>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Telegram ogohlantirishlari">
          {u.tg_chat_id ? (
            <>
              <p className="text-sm text-emerald-700">Telegram ulangan. Har kuni ertalab korxonalaringiz bo&apos;yicha xulosa keladi, risk keskin oshsa — darhol xabar.</p>
              <form action={unlinkTelegram} className="mt-4"><button className="btn-ghost border border-ink-300">Uzish</button></form>
            </>
          ) : (
            <>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-700">
                <li>«Kod olish» tugmasini bosing.</li>
                <li>Botni oching{bot && <> (<a className="link" href={`https://t.me/${bot}`} target="_blank" rel="noreferrer">@{bot}</a>)</>} va 6 xonali kodni yuboring.</li>
                <li>Kod 15 daqiqa amal qiladi, bot darhol javob beradi.</li>
              </ol>
              <form action={telegramCode} className="mt-4"><button className="btn">Kod olish</button></form>
            </>
          )}
        </Card>
        <Card title="Parolni o'zgartirish">
          <form action={changePassword} className="grid gap-4">
            <Field label="Joriy parol" name="eski" type="password" required />
            <Field label="Yangi parol" name="yangi" type="password" required hint="Kamida 8 belgi, harf va raqam. Boshqa qurilmalardagi sessiyalar yopiladi." />
            <div><button className="btn">O&apos;zgartirish</button></div>
          </form>
        </Card>
      </div>
    </>
  );
}
