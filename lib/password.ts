// Parol: scrypt (N=2^15) + tasodifiy salt. Format: scrypt$N$r$p$salt$hash (base64url)
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";

const N = 32768, R = 8, P = 1, LEN = 32;

function scrypt(pass: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((ok, fail) =>
    _scrypt(pass.normalize("NFKC"), salt, LEN, { N: n, r, p, maxmem: 128 * n * r * 2 }, (e, key) => (e ? fail(e) : ok(key))),
  );
}

export async function hashPassword(pass: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(pass, salt, N, R, P);
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(pass: string, stored: string): Promise<boolean> {
  const [alg, n, r, p, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const key = await scrypt(pass, Buffer.from(salt, "base64url"), Number(n), Number(r), Number(p));
  return key.length === expected.length && timingSafeEqual(key, expected);
}

export function passwordProblem(pass: string): string | null {
  if (pass.length < 8) return "Parol kamida 8 belgidan iborat bo'lsin";
  if (!/[0-9]/.test(pass) || !/[A-Za-zА-Яа-яЎўҚқҒғҲҳ]/.test(pass)) return "Parolda harf va raqam bo'lsin";
  return null;
}
