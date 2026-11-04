import { test } from "node:test";
import assert from "node:assert/strict";
import { annualRevenue, prevQuarter, quarterOf, ratios } from "../lib/finance";
import { base } from "./fixtures";
import { parseMoney, short } from "../lib/format";


test("asosiy koeffitsiyentlar", () => {
  const r = ratios(base);
  assert.equal(r.joriy_likvidlik, 2);
  assert.ok(Math.abs(r.tezkor_likvidlik! - 750 / 450) < 1e-9);
  assert.equal(r.avtonomiya, 0.6);
  assert.equal(r.debitor_kun, 20);
  assert.ok(Math.abs(r.pul_yetish_oy! - 600 / 280) < 1e-9);
});

test("nolga bo'lish null qaytaradi", () => {
  const r = ratios({ ...base, joriy_majburiyat: 0, tushum: 0 });
  assert.equal(r.joriy_likvidlik, null);
  assert.equal(r.debitor_kun, null);
});

test("choraklar", () => {
  assert.equal(prevQuarter("2026-Q1"), "2025-Q4");
  assert.equal(quarterOf(new Date(Date.UTC(2026, 10, 4))), "2026-Q4");
  assert.equal(annualRevenue([{ ...base, tushum: 100 }, { ...base, tushum: 300 }]), 800);
});

test("summa o'qish va qisqa ko'rinish", () => {
  assert.equal(parseMoney("1 250 000"), 1250000);
  assert.equal(parseMoney("1.250.000"), 1250000);
  assert.equal(parseMoney("1250000,50"), 1250000.5);
  assert.equal(parseMoney("-35 000 000"), -35000000);
  assert.equal(parseMoney(""), 0);
  assert.equal(short(1_250_000_000), "1,25 mlrd");
});
