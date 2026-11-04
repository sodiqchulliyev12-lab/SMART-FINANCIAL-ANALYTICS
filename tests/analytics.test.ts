import { test } from "node:test";
import assert from "node:assert/strict";
import { balanceAt, discipline, lastQuarters, ppDiff, qKey, qRange, sumFlow, taxNormState, yoyPct, type FinRow } from "../lib/analytics";

const row = (company_id: number, davr: string, p: Partial<FinRow>): FinRow => ({ company_id, davr, tushum: 0, sof_foyda: 0, joriy_aktiv: 0, joriy_majburiyat: 0, soliq_tolangan: 0, kreditorlik: 0, budjet_qarz: 0, uzoq_majburiyat: 0, kapital: 0, pul: 0, ...p });

test("choraklar: oraliq va oxirgi 8 chorak", () => {
  assert.deepEqual(qRange({ y: 2024, q: 1 }), ["2024-01-01", "2024-03-31"]);
  assert.deepEqual(qRange({ y: 2026, q: 4 }), ["2026-10-01", "2026-12-31"]);
  const l = lastQuarters({ y: 2026, q: 2 }, 3).map(qKey);
  assert.deepEqual(l, ["2025-Q4", "2026-Q1", "2026-Q2"]);
});

test("YoY: foiz va foiz punkt, nolga bo'linmaydi", () => {
  assert.equal(yoyPct(110, 100), 10);
  assert.equal(yoyPct(-50, -100), 50);
  assert.equal(yoyPct(5, 0), null);
  assert.equal(Math.round(ppDiff(0.09, 0.12)! * 10) / 10, -3);
});

test("oqim yig'iladi, balans faqat chorak oxiri bo'yicha", () => {
  const rows = [row(1, "2026-Q1", { tushum: 100, joriy_aktiv: 50, joriy_majburiyat: 100 }), row(1, "2026-Q2", { tushum: 200, joriy_aktiv: 300, joriy_majburiyat: 200 }), row(2, "2026-Q2", { tushum: 50, joriy_aktiv: 100, joriy_majburiyat: 100 })];
  assert.equal(sumFlow(rows, new Set(["2026-Q1", "2026-Q2"])).tushum, 350);
  assert.equal(sumFlow(rows, new Set(["2026-Q2"]), new Set([2])).tushum, 50);
  assert.equal(balanceAt(rows, "2026-Q2").likvidlik, 400 / 300);
});

test("soliq yuki me'yori va hisobot intizomi", () => {
  assert.equal(taxNormState("qqs", 0.005), "past");
  assert.equal(taxNormState("aylanma", 0.03), "normal");
  assert.equal(taxNormState("soddalashtirilgan", 0.09), "yuqori");
  const d = discipline([{ muddat: "2026-10-20", holat: "topshirildi" }, { muddat: "2026-10-25", holat: "kutilmoqda" }, { muddat: "2026-12-20", holat: "kutilmoqda" }], "2026-10-01", "2026-12-31", "2026-11-04");
  assert.deepEqual(d, { pct: 0.5, due: 2, late: 1 });
});
