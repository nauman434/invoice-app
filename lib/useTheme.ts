"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

export function getStoredTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return (document.documentElement.getAttribute("data-theme") as Theme) ?? "light";
}

export function setTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  window.localStorage.setItem("theme", theme);
}

export function useTheme(): Theme {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    setThemeState(getStoredTheme());
    const observer = new MutationObserver(() => setThemeState(getStoredTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}
