export function som(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return "—";
  return Math.round(Number(v)).toLocaleString("ru-RU").replace(/ /g, " ");
}

/** 1 250 000 000 → "1,25 mlrd" */
export function short(v: number): string {
  const a = Math.abs(v);
  const f = (x: number) => x.toFixed(x >= 100 ? 0 : x >= 10 ? 1 : 2).replace(".", ",");
  if (a >= 1e12) return `${f(v / 1e12)} trln`;
  if (a >= 1e9) return `${f(v / 1e9)} mlrd`;
  if (a >= 1e6) return `${f(v / 1e6)} mln`;
  if (a >= 1e3) return `${f(v / 1e3)} ming`;
  return String(Math.round(v));
}

export function dateUz(s: string | Date | null | undefined): string {
  if (!s) return "—";
  const d = typeof s === "string" ? s.slice(0, 10) : s.toISOString().slice(0, 10);
  const [y, m, dd] = d.split("-");
  return `${dd}.${m}.${y}`;
}

/** "1 250 000,50" yoki "1.250.000" ni raqamga aylantirish */
export function parseMoney(s: FormDataEntryValue | null): number {
  let t = String(s ?? "").replace(/[\s\u00a0\u202f]/g, "");
  if (/^\(.*\)$/.test(t)) t = "-" + t.slice(1, -1); // 1C/Excel: (1 250 000) = manfiy
  t = t.replace(/,(?=\d{1,2}$)/, ".").replace(/[,'](?=\d{3})/g, "");
  if (!t) return 0;
  const n = Number(t.replace(/\.(?=\d{3}(\D|$))/g, ""));
  return Number.isFinite(n) ? n : NaN;
}
