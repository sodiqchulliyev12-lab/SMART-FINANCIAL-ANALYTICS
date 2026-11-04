import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, audit } from "./db";
import { verifyPassword } from "./password";
import { SESSION_COOKIE, SESSION_HOURS, readSession, signSession } from "./session";

export type User = { id: number; fio: string; login: string; role: "admin" | "staff"; lavozim: string; tg_chat_id: string | null; session_ver: number };

const MAX_FAILS = 5;
const BLOCK_MIN = 15;

export async function login(loginName: string, pass: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const sql = db();
  const [u] = await sql`SELECT * FROM users WHERE lower(login) = lower(${loginName.trim()})`;
  const generic = { ok: false as const, error: "Login yoki parol noto'g'ri" };
  if (!u || !u.active) {
    await verifyPassword(pass, "scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"); // vaqt bo'yicha farq bilinmasin
    return generic;
  }
  if (u.blocked_until && new Date(u.blocked_until) > new Date()) {
    const min = Math.ceil((new Date(u.blocked_until).getTime() - Date.now()) / 60000);
    return { ok: false, error: `Ko'p marta xato kiritildi. ${min} daqiqadan keyin urinib ko'ring.` };
  }
  if (!(await verifyPassword(pass, u.pass_hash))) {
    const fails = u.fail_count + 1;
    await sql`UPDATE users SET fail_count = ${fails >= MAX_FAILS ? 0 : fails},
      blocked_until = ${fails >= MAX_FAILS ? new Date(Date.now() + BLOCK_MIN * 60000) : null} WHERE id = ${u.id}`;
    await audit(u.id, "login_xato", "users");
    return generic;
  }
  await sql`UPDATE users SET fail_count = 0, blocked_until = NULL WHERE id = ${u.id}`;
  (await cookies()).set({
    name: SESSION_COOKIE,
    value: signSession(u.id, u.session_ver),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  await audit(u.id, "login", "users");
  return { ok: true };
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const s = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return null;
  const [u] = await db()<User[]>`SELECT id, fio, login, role, lavozim, tg_chat_id::text, session_ver FROM users WHERE id = ${s.uid} AND active`;
  if (!u || u.session_ver !== s.ver) return null;
  return u;
}

export async function requireUser(): Promise<User> {
  const u = await currentUser();
  if (!u) redirect("/login/");
  return u;
}

export async function requireAdmin(): Promise<User> {
  const u = await requireUser();
  if (u.role !== "admin") redirect("/?xato=" + encodeURIComponent("Bu bo'lim faqat rahbariyat uchun"));
  return u;
}

/** Xodim faqat o'ziga biriktirilgan korxonalarni ko'radi; rahbariyat — hammasini */
export function companyScope(u: User) {
  return u.role === "admin" ? null : u.id;
}

export async function canSeeCompany(u: User, companyId: number): Promise<boolean> {
  if (u.role === "admin") return true;
  const [c] = await db()`SELECT 1 FROM companies WHERE id = ${companyId} AND masul_id = ${u.id}`;
  return Boolean(c);
}
