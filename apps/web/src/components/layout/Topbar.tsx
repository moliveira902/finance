"use client";
import { Monitor, Smartphone, Sun, Moon } from "lucide-react";
import { useAppContext, type Viewport } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./NotificationBell";

const VIEWPORTS: { id: Viewport; label: string; icon: React.ElementType }[] = [
  { id: "desktop", label: "Desktop",  icon: Monitor    },
  { id: "mobile",  label: "Mobile",   icon: Smartphone },
];

export function Topbar() {
  const { theme, viewport, toggleTheme, setViewport } = useAppContext();

  return (
    <div className="sticky top-0 z-20 flex items-center gap-3 px-5 h-12 border-b border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shrink-0">
      {/* Viewport toggle */}
      <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 gap-0.5">
        {VIEWPORTS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setViewport(id)}
            className={cn(
              "flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-medium transition-all",
              viewport === id
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
            )}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      <NotificationBell />

      {/* Dark / light toggle */}
      <button
        onClick={toggleTheme}
        aria-label="Toggle dark mode"
        className={cn(
          "flex items-center gap-1.5 h-7 px-3 rounded-lg border text-xs font-medium transition-colors",
          "border-slate-200 dark:border-slate-700",
          "text-slate-500 dark:text-slate-400",
          "hover:bg-slate-50 dark:hover:bg-slate-800"
        )}
      >
        {theme === "light" ? (
          <><Moon size={13} /> Escuro</>
        ) : (
          <><Sun size={13} /> Claro</>
        )}
      </button>
    </div>
  );
}
