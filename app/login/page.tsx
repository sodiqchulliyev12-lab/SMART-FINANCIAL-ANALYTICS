import { redirect } from "next/navigation";
import { currentUser, login } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { Prefs } from "@/components/Prefs";

async function doLogin(form: FormData) {
  "use server";
  const r = await login(String(form.get("login") ?? ""), String(form.get("password") ?? ""));
  if (!r.ok) redirect(`/login/?xato=${encodeURIComponent(r.error)}`);
  redirect("/");
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ xato?: string }> }) {
  if (await currentUser()) redirect("/");
  const { xato } = await searchParams;
  const t = await getT();
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-2xl text-white">◆</div>
          <h1 className="mt-3 text-xl font-semibold">Aqilli Moliya</h1>
          <p className="text-sm text-ink-500">{t("Moliyaviy tahlil va risklar nazorati")}</p>
        </div>
        {xato && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{t(xato.slice(0, 200))}</p>}
        <form action={doLogin} className="space-y-4">
          <div>
            <label className="label" htmlFor="login">{t("Login")}</label>
            <input id="login" name="login" className="input" autoComplete="username" required autoFocus />
          </div>
          <div>
            <label className="label" htmlFor="password">{t("Parol")}</label>
            <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
          </div>
          <button className="btn w-full">{t("Kirish")}</button>
        </form>
        <p className="mt-6 text-center text-xs text-ink-500">{t("5 marta xato kiritilsa, login 15 daqiqaga bloklanadi.")}</p>
        <Prefs className="mt-4 justify-center" />
      </div>
    </main>
  );
}
