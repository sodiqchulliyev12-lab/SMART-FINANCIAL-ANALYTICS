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
