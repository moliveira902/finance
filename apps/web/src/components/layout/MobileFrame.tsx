"use client";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, ArrowLeftRight, RepeatIcon, BarChart2, Settings,
  Wifi, Signal, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/contexts/LanguageContext";

const NAV_ROUTES = [
  { href: "/dashboard",    icon: LayoutDashboard, key: "dashboard"    },
  { href: "/transactions", icon: ArrowLeftRight,  key: "transactions" },
  { href: "/recorrentes",  icon: RepeatIcon,      key: "recurring"    },
  { href: "/reports",      icon: BarChart2,       key: "reports"      },
  { href: "/settings",     icon: Settings,        key: "settings"     },
];

function NavTabs({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { t }    = useTranslation();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className={cn("flex items-center justify-around", compact ? "px-1" : "px-2")}>
      {NAV_ROUTES.map(({ href, icon: Icon, key }) => {
        const label = t(`nav.${key}`).split(" ")[0];
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <button
            key={href}
            onClick={() => router.push(href)}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-xl transition-colors min-w-0",
              compact ? "px-2 py-1" : "px-3 py-1.5",
              active
                ? "text-sky-500"
                : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"
            )}
          >
            <Icon size={compact ? 20 : 22} strokeWidth={active ? 2.5 : 1.8} />
            <span className={cn("font-semibold truncate", compact ? "text-[10px]" : "text-[9px]")}>
              {label}
            </span>
          </button>
        );
      })}
      <button
        onClick={handleLogout}
        className={cn(
          "flex flex-col items-center gap-0.5 rounded-xl transition-colors min-w-0",
          compact ? "px-2 py-1" : "px-3 py-1.5",
          "text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400"
        )}
      >
        <LogOut size={compact ? 20 : 22} strokeWidth={1.8} />
        <span className={cn("font-semibold truncate", compact ? "text-[10px]" : "text-[9px]")}>
          {t("nav.logout").split(" ")[0]}
        </span>
      </button>
    </div>
  );
}

function BatteryIcon() {
  return (
    <svg width="22" height="12" viewBox="0 0 22 12" fill="none" className="text-current">
      <rect x="0.5" y="0.5" width="18" height="11" rx="2.5" stroke="currentColor" strokeOpacity="0.35" />
      <rect x="2" y="2" width="13" height="8" rx="1.5" fill="currentColor" />
      <path d="M19.5 4.5v3a1.5 1.5 0 000-3z" fill="currentColor" fillOpacity="0.4" />
    </svg>
  );
}

// ── Phone simulator (desktop "Mobile" preview) ────────────────────────────────
export function MobileFrame({ children }: { children: React.ReactNode }) {
  const { locale } = useTranslation();
  const now  = new Date();
  const time = now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex justify-center items-start min-h-full py-6 px-4 bg-slate-200 dark:bg-slate-950">
      {/* Phone body */}
      <div className="relative flex-shrink-0" style={{ width: 393 }}>
        {/* Outer chrome */}
        <div className="bg-slate-800 dark:bg-slate-950 rounded-[52px] p-[3px] shadow-[0_40px_80px_-12px_rgba(0,0,0,0.5)]">
          {/* Inner bezel */}
          <div className="bg-slate-900 rounded-[50px] p-[10px]">
            {/* Screen */}
            <div
              className="bg-white dark:bg-slate-900 rounded-[42px] overflow-hidden relative flex flex-col"
              style={{ height: 812 }}
            >
              {/* Dynamic island */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-10 flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-700" />
                <div className="w-3 h-3 rounded-full bg-slate-700 border border-slate-600" />
              </div>

              {/* Status bar */}
              <div className="flex items-center justify-between px-8 pt-4 pb-1 shrink-0">
                <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                  {time}
                </span>
                <div className="flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                  <Signal size={13} />
                  <Wifi   size={13} />
                  <BatteryIcon />
                </div>
              </div>

              {/* ── TOP navigation bar ── */}
              <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 pt-1 pb-2">
                <NavTabs compact={false} />
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pt-3 pb-4 @container">
                {children}
              </div>

              {/* Home indicator */}
              <div className="shrink-0 flex justify-center py-2 bg-white dark:bg-slate-900">
                <div className="w-28 h-1 bg-slate-900 dark:bg-slate-100 rounded-full opacity-20" />
              </div>
            </div>
          </div>
        </div>

        {/* Side buttons */}
        <div className="absolute left-[-4px] top-[120px] w-1 h-8 bg-slate-700 dark:bg-slate-800 rounded-l-sm" />
        <div className="absolute left-[-4px] top-[158px] w-1 h-12 bg-slate-700 dark:bg-slate-800 rounded-l-sm" />
        <div className="absolute left-[-4px] top-[180px] w-1 h-12 bg-slate-700 dark:bg-slate-800 rounded-l-sm" />
        <div className="absolute right-[-4px] top-[148px] w-1 h-20 bg-slate-700 dark:bg-slate-800 rounded-r-sm" />
      </div>
    </div>
  );
}

// ── Real mobile layout (actual phones / small screens) ────────────────────────
// No phone chrome — fills the real viewport. Nav is pinned at the top.
export function RealMobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-900">
      {/* Sticky top navigation */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800 safe-top">
        <NavTabs compact={true} />
      </div>

      {/* Scrollable page content */}
      <main className="flex-1 px-4 py-5 @container">
        {children}
      </main>
    </div>
  );
}
