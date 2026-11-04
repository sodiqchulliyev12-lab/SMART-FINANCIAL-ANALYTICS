import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword, passwordProblem } from "../lib/password";
import { readSession, signSession } from "../lib/session";

process.env.SESSION_SECRET = "test-secret-0123456789";

test("parol xeshi tekshiriladi va har safar har xil", async () => {
  const a = await hashPassword("Parol123");
  const b = await hashPassword("Parol123");
  assert.notEqual(a, b);
  assert.ok(await verifyPassword("Parol123", a));
  assert.ok(!(await verifyPassword("parol123", a)));
  assert.equal(passwordProblem("qisqa1"), "Parol kamida 8 belgidan iborat bo'lsin");
  assert.equal(passwordProblem("Uzunparol1"), null);
});

test("sessiya imzosi, muddati va soxtalashtirish", () => {
  const t = signSession(7, 2, 1_000_000);
  assert.deepEqual(readSession(t, 1_000_001), { uid: 7, ver: 2 });
  assert.equal(readSession(t, 1_000_000 + 13 * 3600_000), null);
  assert.equal(readSession(t.replace(/^7\./, "8."), 1_000_001), null);
  assert.equal(readSession("garbage", 0), null);
});
