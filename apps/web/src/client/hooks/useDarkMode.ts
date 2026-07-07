import { useEffect, useState } from "react";

type Mode = "light" | "dark";

export function useDarkMode() {
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem("theme") as Mode) ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-mode", mode);
    localStorage.setItem("theme", mode);
  }, [mode]);

  const toggle = () => setMode((m) => (m === "dark" ? "light" : "dark"));

  return { mode, toggle };
}
