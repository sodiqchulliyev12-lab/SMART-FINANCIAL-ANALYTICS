// Risk omillari bazada o'zbekcha saqlanadi; ko'rsatishda sarlavha va tavsiya lug'atdan, tafsilot esa iboralar bo'yicha tarjima qilinadi.
import type { T } from "./i18n";
import type { RiskFactor } from "./risk";

const DETAIL_RU: [RegExp, string][] = [
  [/(\d+) ta majburiyat kechikkan, eng uzog'i (\d+) kun\./g, "просрочено обязательств: $1, максимум $2 дн."],
  [/(\d+) ta faktura 5 kundan ortiq imzo kutmoqda/g, "$1 счетов-фактур ждут подписи более 5 дней"],
  [/(\d+) ta faktura, jami/g, "$1 счетов-фактур, всего"],
  [/Joriy likvidlik ([\d.]+) \(me'yor ≥ 1,5\)/g, "Текущая ликвидность $1 (норма ≥ 1,5)"],
  [/Mavjud pul (.+?) taxminan (\d+) kunlik xarajatga yetadi/g, "Денег $1 хватит примерно на $2 дн. расходов"],
  [/Debitorlik aylanishi (\d+) kun/g, "Оборачиваемость дебиторки $1 дн."],
  [/Moliyaviy mustaqillik (\d+)%/g, "Финансовая независимость $1%"],
  [/Yillik tushum ~(.+?), chegara (.+?) \((\d+)%\)/g, "Годовая выручка ~$1, лимит $2 ($3%)"],
  [/Oxirgi kiritilgan davr: /g, "Последний введённый период: "],
  [/Balans va moliyaviy natijalar yo'q/g, "Нет баланса и отчёта о финансовых результатах"],
  [/\(dep\.customs\.uz qarzdorlar ro'yxati\)/g, "(реестр должников dep.customs.uz)"],
  [/import avansi qoplanmagan/g, "импортный аванс не закрыт"],
  [/eksport tushumi kelmagan/g, "экспортная выручка не поступила"],
  [/(\d+) kun qoldi/g, "осталось $1 дн."],
  [/my\.mehnat\.uz bo'yicha korxonada rasmiylashtirilgan xodim ko'rinmayapti/g, "по my.mehnat.uz в организации нет оформленных работников"],
  [/90 kunda (\d+) kishi ketdi \((\d+)%\), (\d+) kishi keldi\. Hozir (\d+) kishi/g, "за 90 дней ушли $1 чел. ($2%), пришли $3. Сейчас $4 чел."],
  [/To'langan soliq tushumning ([\d.]+)%/g, "Уплаченные налоги — $1% выручки"],
  [/kapital/g, "капитал"],
  [/Qarz:? /g, "Долг "],
  [/(\d+) kun\b/g, "$1 дн."],
  [/ so'm/g, " сум"],
];

export function trDetail(s: string, lang: "uz" | "ru"): string {
  if (lang !== "ru") return s;
  return DETAIL_RU.reduce((acc, [re, to]) => acc.replace(re, to), s);
}

export function factorText(f: RiskFactor, t: T) {
  return { title: t(f.title), detail: trDetail(f.detail, t.lang), tavsiya: t(f.tavsiya) };
}
