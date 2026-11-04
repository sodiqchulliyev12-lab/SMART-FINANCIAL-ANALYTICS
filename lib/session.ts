// Imzolangan sessiya cookie: "uid.ver.exp.hmac". ver — parol o'zgarsa yoki «hamma qurilmadan chiqish» bosilsa oshadi.
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "am_session";
export const SESSION_HOURS = 12;

export function sessionSecret(): string {
  const s = process.env.SESSION_SECRET || "";
  if (s.length < 16) throw new Error("SESSION_SECRET kamida 16 belgi bo'lsin (Railway → Variables)");
  return s;
}

const mac = (payload: string) => createHmac("sha256", sessionSecret()).update(payload).digest("base64url");

export function signSession(uid: number, ver: number, now = Date.now()): string {
  const payload = `${uid}.${ver}.${now + SESSION_HOURS * 3600_000}`;
  return `${payload}.${mac(payload)}`;
}

export function readSession(token: string | undefined, now = Date.now()): { uid: number; ver: number } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const payload = parts.slice(0, 3).join(".");
  const a = Buffer.from(parts[3]);
  const b = Buffer.from(mac(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [uid, ver, exp] = parts.slice(0, 3).map(Number);
  if (!uid || !(exp > now)) return null;
  return { uid, ver };
}
