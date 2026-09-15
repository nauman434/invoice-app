"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme, setTheme } from "@/lib/useTheme";

export default function ThemeToggle() {
  const theme = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="sidebar-item"
      style={{ width: "100%", background: "none", border: "none", textAlign: "left" }}
    >
      {theme === "dark" ? <Sun size={15} strokeWidth={1.75} /> : <Moon size={15} strokeWidth={1.75} />}
      <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
