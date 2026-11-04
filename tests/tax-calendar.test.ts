import { test } from "node:test";
import assert from "node:assert/strict";
import { deadlinesBetween, parseIso, toWorkday, DEFAULT_TAX_TYPES, periodHuman } from "../lib/tax-calendar";

const cal = { holidays: new Set<string>(), workdays: new Set<string>() };
const tt = (c: string) => DEFAULT_TAX_TYPES.find((t) => t.code === c)!;

test("dam olish kuniga tushgan muddat dushanbaga suriladi", () => {
  // 2026-12-20 — yakshanba
  assert.equal(toWorkday(parseIso("2026-12-20"), cal).toISOString().slice(0, 10), "2026-12-21");
  assert.equal(toWorkday(parseIso("2026-12-19"), cal).toISOString().slice(0, 10), "2026-12-21");
});

test("bayram va 'ish kuni' deb belgilangan shanba hisobga olinadi", () => {
  const c = { holidays: new Set(["2026-12-21"]), workdays: new Set(["2026-12-19"]) };
  assert.equal(toWorkday(parseIso("2026-12-19"), c).toISOString().slice(0, 10), "2026-12-19");
  assert.equal(toWorkday(parseIso("2026-12-20"), c).toISOString().slice(0, 10), "2026-12-22");
});

test("QQS: oktabr davri 20-noyabrda", () => {
  const r = deadlinesBetween(tt("qqs"), parseIso("2026-11-01"), parseIso("2026-11-30"), cal);
  assert.deepEqual(r, [{ davr: "2026-10", muddat: "2026-11-20" }]);
});

test("Choraklik foyda: 4-chorak yaratilmaydi, yillik 1-martda", () => {
  const q = deadlinesBetween(tt("foyda"), parseIso("2026-01-01"), parseIso("2027-12-31"), cal).map((x) => x.davr);
  assert.ok(!q.includes("2026-Q4"));
  assert.ok(q.includes("2026-Q3"));
  const y = deadlinesBetween(tt("foyda_yil"), parseIso("2027-01-01"), parseIso("2027-12-31"), cal);
  assert.deepEqual(y, [{ davr: "2026", muddat: "2027-03-01" }]);
});

test("Dekabr davri keyingi yil yanvariga o'tadi", () => {
  const r = deadlinesBetween(tt("aylanma"), parseIso("2027-01-01"), parseIso("2027-01-31"), cal);
  assert.deepEqual(r, [{ davr: "2026-12", muddat: "2027-01-15" }]);
});

test("davr nomlari", () => {
  assert.equal(periodHuman("2026-10"), "oktabr 2026");
  assert.equal(periodHuman("2026-Q3"), "3-chorak 2026");
  assert.equal(periodHuman("2026"), "2026 yil");
});

test("statistika: 1-korxona yillik — keyingi yil 1-aprel, 4-mehnat — chorakdan keyin 6-kun", () => {
  const cal = { holidays: new Set<string>(), workdays: new Set<string>() };
  const k = DEFAULT_TAX_TYPES.find((t) => t.code === "st_1korxona")!;
  assert.equal(k.turi, "statistika");
  assert.deepEqual(deadlinesBetween(k, parseIso("2027-01-01"), parseIso("2027-12-31"), cal), [{ davr: "2026", muddat: "2027-04-01" }]);
  const m = DEFAULT_TAX_TYPES.find((t) => t.code === "st_4mehnat")!;
  assert.deepEqual(deadlinesBetween(m, parseIso("2026-10-01"), parseIso("2026-10-31"), cal), [{ davr: "2026-Q3", muddat: "2026-10-06" }]);
});
