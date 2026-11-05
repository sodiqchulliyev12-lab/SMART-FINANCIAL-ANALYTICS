"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Bolalarni keng ekranda yuqori paneldagi #header-slot ga ko'taradi; telefonda joyida qoldiradi */
export function HeaderSlot({ children, inline }: { children: ReactNode; inline: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [wide, setWide] = useState<boolean | null>(null);
  useEffect(() => {
    setTarget(document.getElementById("header-slot"));
    const mq = window.matchMedia("(min-width: 768px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  if (wide === null) return null;
  if (wide && target) return createPortal(children, target);
  return <>{inline}</>;
}
