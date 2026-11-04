"use client";
export default function PanelError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-900">
      <h2 className="text-lg font-semibold">Xatolik yuz berdi</h2>
      <p className="mt-2">{error.message || "Noma'lum xato"}</p>
      <button onClick={reset} className="btn mt-4">Qayta urinish</button>
    </div>
  );
}
