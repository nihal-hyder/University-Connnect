"use client";

import { useEffect } from "react";

/** Marks the intro as finished so later client navigations animate immediately. */
export function IntroDone() {
  useEffect(() => {
    const t = window.setTimeout(() => document.documentElement.setAttribute("data-intro-done", ""), 2100);
    return () => window.clearTimeout(t);
  }, []);
  return null;
}
