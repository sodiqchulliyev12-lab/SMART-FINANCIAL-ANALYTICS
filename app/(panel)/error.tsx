"use client";
const ru = () => typeof document !== "undefined" && document.documentElement.lang === "ru";
export default function PanelError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
      <h2 className="text-lg font-semibold">{ru() ? "Произошла ошибка" : "Xatolik yuz berdi"}</h2>
      <p className="mt-2">{error.message || (ru() ? "Неизвестная ошибка" : "Noma'lum xato")}</p>
      <button onClick={reset} className="btn mt-4">{ru() ? "Повторить" : "Qayta urinish"}</button>
    </div>
  );
}
