"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const THEME_STORAGE_KEY = "computebrief:theme";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // The <head> script sets the class before hydration; read it back here
    // (rather than in useState's initializer, which runs during SSR too)
    // so the icon reflects the theme the page actually rendered with.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // Non-fatal.
    }
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}>
      {isDark ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}
