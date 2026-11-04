# Aqilli Moliya: korxonalar moliyaviy holati va risklar nazorati

Buxgalteriya (autsorsing) firmasi uchun sayt va Telegram bot. Firma o'z mijoz korxonalarining soliq intizomini, moliyaviy holatini va kelgusidagi risklarini bitta panelda ko'radi. Muammo jarimaga aylanishidan oldin ogohlantirish oladi.

| Qism | Texnologiya |
|---|---|
| Sayt | Next.js 15 (server komponentlar, server actions) + Tailwind |
| Baza | PostgreSQL (Railway Postgres) |
| Bot | grammY (long polling, saytning o'zi bilan bitta servisda) |
| Testlar | `node:test` + tsx (`npm test`) |

## Nimalar qila oladi

**Risk paneli.** Har bir korxonaga 0–100 ball beriladi. Daraja: past, o'rta, yuqori yoki kritik. Har bir omilning izohi va aniq tavsiyasi bor. Ball 5 guruhdan yig'iladi:

| Guruh | Omillar |
|---|---|
| Soliq intizomi | kechikkan hisobot yoki to'lov; 3 kun ichidagi muddatlar; javobsiz soliq xatlari (SK 159-1); 5 kundan uzoq imzolanmagan EHF; yuqori tavakkalchilikdagi kontragentlar |
| Moliyaviy holat | manfiy kapital; past likvidlik; pul zaxirasi kam; ketma-ket zarar; tushumning keskin kamayishi; budjetga qarz (SK 121-1); sekin yig'ilayotgan debitorlik; qarzga bog'liqlik |
| Soliq rejimi | aylanma chegarasi 12 000 BHM ga yaqinlashish (PF-100, 01.06.2026); juda past soliq yuki |
| Shartnomalar | tugagan yoki 30 kun ichida tugaydigan ijara |
| Ma'lumot sifati | moliyaviy ma'lumot eskirgan yoki kiritilmagan |

**Moliyaviy tahlil.** Har chorakda balans va moliyaviy natijalar kiritiladi yoki 1C/Excel'dan CSV qilib yuklanadi. Sayt 12 ta koeffitsiyentni hisoblaydi va me'yor bilan solishtiradi: likvidlik (joriy, tezkor, mutlaq), moliyaviy mustaqillik, qarz yuki, marja, rentabellik, ROA, debitorlik va kreditorlik aylanishi, soliq yuki va pul zaxirasi. Tushum va foyda dinamikasi grafikda ko'rinadi.

**Statistika hisobotlari.** 2026 yil shakllari (1-korxona, 12-korxona, 4-mehnat, 4-invest, 4-transport, 4-fx, 4-MIZ, 4-kb). Har bir korxonaga kerakli shakllar uning sahifasida belgilanadi (ro'yxat stat.uz «Taqdim etiladigan hisobotlar ro'yxati» xizmatida ko'rinadi). Yangi shaklni Sozlamalar'dan qo'shish mumkin. Muddatlar soliq hisobotlari bilan bitta jadvalda, to'lovsiz.

**Hisobot muddatlari.** Korxonaning soliq rejimiga qarab muddatlar har kuni avtomatik yaratiladi. Dam olish yoki bayram kuniga tushgan muddat keyingi ish kuniga suriladi. Har bir muddatga «Topshirildi» va «To'landi» belgisi qo'yiladi.

**Soliq xatlari, EHF, ijara.** Ma'lumot qo'lda kiritiladi yoki Soliq Monitor orqali avtomatik tushadi.

**Ishchilar.** Har bir korxonada hozir nechta odam ishlayapti, 30 va 90 kunda kim kirdi, kim bo'shadi (my.mehnat.uz yoki qo'lda). Risk paneli faol xodim yo'qligini va 90 kunda xodimlarning 20% dan ko'pi ketganini ogohlantiradi. JShShIR bazada saqlanmaydi, faqat xeshi.

**Bojxona.** Bojxona to'lovlari bo'yicha qarz (dep.customs.uz/qarzdor), tashqi savdo shartnomalari (contract.customs.uz) va yuk deklaratsiyalari (ed2.customs.uz). Risk paneli bojxona qarzini, 180 kun ichida qoplanmagan import avansi yoki eksport tushumini va muddati tugagan TIF shartnomalarini ogohlantiradi.

**Telegram.** Har bir xodim o'z korxonalari bo'yicha kunlik xulosa oladi: risklar, ball keskin oshganlar va 3 kun ichidagi muddatlar. Yangi soliq xati kelsa, darhol xabar keladi. `/xulosa` buyrug'i joriy holatni ko'rsatadi.

**Xavfsizlik.**
- Parollar scrypt bilan saqlanadi.
- 5 marta xato kiritilsa, login 15 daqiqaga bloklanadi.
- Sessiya imzolangan cookie'da 12 soat amal qiladi. Parol o'zgarsa, barcha qurilmalardagi sessiyalar yopiladi.
- Xodim faqat o'ziga biriktirilgan korxonalarni ko'radi va ruxsat har bir amalda serverda tekshiriladi.
- Kim nimani o'zgartirgani Jurnal'da yoziladi.
- Sayt boshqa saytga iframe orqali joylanmaydi (`X-Frame-Options: DENY`).

## Railway'ga joylash (~15 daqiqa)

1. [railway.com](https://railway.com) → **New Project → Deploy from GitHub repo** → shu repozitoriyani tanlang.
2. Shu loyiha ichida **+ New → Database → PostgreSQL** qo'shing.
3. Sayt servisi → **Variables**:

| O'zgaruvchi | Qiymat |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (Railway taklif qiladi) |
| `SESSION_SECRET` | 32+ belgili tasodifiy matn |
| `ADMIN_LOGIN` | birinchi rahbar logini, masalan `admin` |
| `ADMIN_PASSWORD` | birinchi rahbar paroli (kirgach Profil'dan o'zgartiring) |
| `TELEGRAM_BOT_TOKEN` | @BotFather bergan token (ixtiyoriy) |
| `TELEGRAM_BOT_USERNAME` | botning username'i, `@` siz (ixtiyoriy) |
| `MONITOR_KEY` | Soliq Monitor uchun 16+ belgili kalit (ixtiyoriy) |

4. **Settings → Networking → Generate Domain**.
5. Servisni **1 nusxada** qoldiring, chunki bot va fon vazifalari bitta jarayonda ishlaydi.

Birinchi ishga tushishda jadvallar o'zi yaratiladi va `ADMIN_LOGIN` / `ADMIN_PASSWORD` dan birinchi rahbar qo'shiladi. GitHub'ga har safar o'zgarish yuklanganda Railway saytni avtomatik yangilaydi.

### Namuna ma'lumot (ixtiyoriy)
Bo'sh bazada saytni ko'rsatish uchun: `DATABASE_URL=... npm run seed:demo`. U 7 ta namuna korxona va 2 ta xodim qo'shadi (`dilnoza` va `jasur`, ikkalasining paroli `Demo12345`).

## Birinchi sozlash
1. **Sozlamalar.** Firma nomini va joriy BHM'ni kiriting. Soliq turlari muddatlarini tekshiring: standart qiymatlar taxminiy, ularni joriy Soliq kodeksi bo'yicha moslang. Kalendar'ga bayramlarni qo'shing.
2. **Xodimlar.** Buxgalterlarni qo'shing.
3. **Korxonalar.** Mijozlarni kiriting (STIR, rejim, mas'ul xodim). Muddatlar avtomatik yaratiladi.
4. Har bir korxona sahifasida oxirgi chorak balansini kiriting yoki CSV yuklang.

## Soliq Monitor API
my.soliq.uz, Didox va ijara.soliq.uz'ni tekshiruvchi tashqi dastur natijani shu manzilga yuboradi:

```http
POST /api/monitor/
Authorization: Bearer <MONITOR_KEY>
Content-Type: application/json

{
  "letters": [{ "stir": "305112233", "tur": "Talabnoma", "raqam": "T-15", "sana": "2026-11-03", "mazmun": "...", "javob_muddati": "2026-11-10" }],
  "ehf":     [{ "stir": "305112233", "raqam": "F-1", "kontragent": "X MChJ", "kontragent_stir": "302...", "summa": 12000000, "sana": "2026-11-01", "yonalish": "kiruvchi", "holati": "imzo_kutmoqda", "xavfli": false }],
  "leases":  [{ "stir": "305112233", "raqam": "IJ-1", "tomon": "...", "boshlanish": "2026-01-01", "tugash": "2026-12-31", "holati": "faol" }],
  "bojxona_qarz": [{ "stir": "305112233", "summa": 4200000, "tafsilot": "boj to'lovi penyasi", "sana": "2026-11-04" }],
  "tif_shartnomalar": [{ "stir": "305112233", "raqam": "TIF-2026/07", "turi": "import", "kontragent": "...", "davlat": "Xitoy", "valyuta": "USD",
                         "summa": 120000, "tolangan": 60000, "yetkazilgan": 25000, "ochiq_sana": "2026-03-10", "sana": "2026-03-02", "tugash": "2027-03-01", "holati": "faol" }],
  "deklaratsiyalar": [{ "stir": "305112233", "raqam": "26001/04.09.2026/0012345", "sana": "2026-09-04", "rejim": "IM40", "turi": "import",
                        "shartnoma": "TIF-2026/07", "valyuta": "USD", "summa": 25000, "boj_tolov": 61500000, "holati": "rasmiylashtirildi" }],
  "xodimlar": [{ "stir": "305112233", "jshshir": "30101900000000", "fio": "Aliyev Akmal", "lavozim": "Novvoy", "shartnoma": "muddatsiz",
                 "kirgan": "2025-01-10", "ketgan": null }]
}
```

`bojxona_qarz` da `summa: 0` yuborilsa, korxona tekshirildi va qarzi yo'q deb belgilanadi. Korxona STIR bo'yicha topiladi. Bir xil raqamli yozuv qayta yuborilsa, yangilanadi. Javobda bazada topilmagan STIR'lar (`unknown_stir`) qaytadi.

## Ishlab chiqish
```bash
npm install
cp .env.example .env.local   # DATABASE_URL va SESSION_SECRET'ni to'ldiring
npm run dev                  # http://localhost:3000
npm test                     # risk dvigateli, muddatlar, moliya, xavfsizlik testlari
npm run typecheck
```

| Papka | Nima bor |
|---|---|
| `lib/risk.ts` | risk dvigateli (sof funksiya, testlangan) |
| `lib/finance.ts` | moliyaviy koeffitsiyentlar |
| `lib/tax-calendar.ts` | muddatlar va ish kunlari |
| `lib/data.ts` | bazadan o'qish, muddat yaratish, riskni saqlash |
| `app/(panel)/` | sahifalar; `actions.ts` — barcha yozish amallari |
| `bot/` | Telegram bot, kunlik xulosa, ogohlantirishlar |
| `migrations/` | SQL sxema (ishga tushganda avtomatik bajariladi) |

## Keyingi bosqichlar
- Soliq Monitor dasturi (Python + Playwright, alohida Railway servisi): my.soliq.uz va ijara.soliq.uz; Didox uchun rasmiy API.
- Kutilayotgan QQS va solishtirma dalolatnoma (bank ko'chirmasi + EHF).
- Uch tilli interfeys (o'zbek lotin, o'zbek kirill, rus).
- Pul oqimi prognozi (keyingi 90 kun).
