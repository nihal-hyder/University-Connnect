"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { THEME_KEY } from "./theme-script";

type Choice = "light" | "dark" | "system";

function read(): Choice {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function apply(choice: Choice) {
  const dark = choice === "dark" || (choice === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  const mq = matchMedia("(prefers-color-scheme: dark)");
  const onSystem = () => {
    if (read() === "system") apply("system");
  };
  mq.addEventListener("change", onSystem);
  return () => {
    listeners.delete(cb);
    mq.removeEventListener("change", onSystem);
  };
}

const NEXT: Record<Choice, Choice> = { system: "light", light: "dark", dark: "system" };
const LABEL: Record<Choice, string> = { light: "Light theme", dark: "Dark theme", system: "System theme" };

export function ThemeToggle({ className }: { className?: string }) {
  const choice = useSyncExternalStore(subscribe, read, () => "system" as Choice);
  const Icon = choice === "light" ? Sun : choice === "dark" ? Moon : Monitor;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      aria-label={`${LABEL[choice]}. Switch to ${LABEL[NEXT[choice]].toLowerCase()}`}
      title={LABEL[choice]}
      onClick={() => {
        const next = NEXT[choice];
        try {
          localStorage.setItem(THEME_KEY, next);
        } catch {
          /* storage blocked: still switch for this page view */
        }
        document.documentElement.classList.add("theme-switching");
        apply(next);
        listeners.forEach((l) => l());
        window.setTimeout(() => document.documentElement.classList.remove("theme-switching"), 350);
      }}
    >
      <Icon />
    </Button>
  );
}
