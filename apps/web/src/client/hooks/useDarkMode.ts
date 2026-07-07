import { useSyncExternalStore } from "react";
import { defaultColorMode } from "../../modules";

type Mode = "light" | "dark";

// Dark mode is platform-wide state applied to <html data-mode> — one store,
// not per-component state, so every surface (public pages, dashboard, blog)
// sees the same mode. The root layout subscribes, which guarantees the
// attribute is applied on pages that render no toggle at all; toggles
// anywhere update every subscriber.

const listeners = new Set<() => void>();

function initialMode(): Mode {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem("theme") as Mode | null;
  if (stored) return stored;
  // No stored choice: the site manifest decides — pinned mode, or follow
  // the visitor's system preference.
  if (defaultColorMode !== "system") return defaultColorMode;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

let mode: Mode = initialMode();
if (typeof document !== "undefined") {
  document.documentElement.setAttribute("data-mode", mode);
}

function setMode(next: Mode) {
  mode = next;
  document.documentElement.setAttribute("data-mode", next);
  localStorage.setItem("theme", next);
  for (const notify of listeners) notify();
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

export function useDarkMode() {
  const current = useSyncExternalStore(
    subscribe,
    () => mode,
    () => "light" as Mode
  );
  return {
    mode: current,
    toggle: () => setMode(mode === "dark" ? "light" : "dark"),
  };
}
