"use client";
import { createContext, useContext, useEffect, useState } from "react";

export type Theme    = "light" | "dark";
export type Viewport = "desktop" | "mobile";

interface AppContextValue {
  theme:         Theme;
  viewport:      Viewport;
  isSmallScreen: boolean; // true when the actual browser window is < 768 px
  toggleTheme:   () => void;
  setViewport:   (v: Viewport) => void;
}

const AppContext = createContext<AppContextValue>({
  theme:         "light",
  viewport:      "desktop",
  isSmallScreen: false,
  toggleTheme:   () => {},
  setViewport:   () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme,         setTheme]         = useState<Theme>("light");
  const [viewport,      setViewport]      = useState<Viewport>("desktop");
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [mounted,       setMounted]       = useState(false);

  // Detect actual screen width — drives the real-phone layout independently of
  // the manual Desktop / Mobile toggle (which is for preview only).
  useEffect(() => {
    const check = () => setIsSmallScreen(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    setMounted(true);
    const t = localStorage.getItem("fa_theme")    as Theme    | null;
    const v = localStorage.getItem("fa_viewport") as Viewport | null;
    if (t) setTheme(t);
    if (v) setViewport(v);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("fa_theme", theme);
  }, [theme, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("fa_viewport", viewport);
  }, [viewport, mounted]);

  function toggleTheme() {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }

  return (
    <AppContext.Provider value={{ theme, viewport, isSmallScreen, toggleTheme, setViewport }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);
