"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard, ArrowLeftRight, RepeatIcon,
  BarChart2, Settings, LogOut, Wallet, ShieldCheck, Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFinanceStore } from "@/stores/financeStore";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ChangelogModal } from "@/components/ui/ChangelogModal";
import { CURRENT_VERSION } from "@/lib/changelog";

function nameInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Usuário";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

const NAV = [
  { label: "Dashboard",     href: "/dashboard",    icon: LayoutDashboard },
  { label: "Transações",    href: "/transactions", icon: ArrowLeftRight  },
  { label: "Recorrentes",   href: "/recorrentes",  icon: RepeatIcon      },
  { label: "Relatórios",    href: "/reports",      icon: BarChart2       },
  { label: "Meu Consultor", href: "/coach",        icon: Bot             },
  { label: "Configurações", href: "/settings",     icon: Settings        },
];

export function Sidebar() {
  const pathname    = usePathname();
  const router      = useRouter();
  const { profile } = useFinanceStore();
  const currentUser = useCurrentUser();
  const initials    = nameInitials(profile.name);
  const displayName = shortName(profile.name);
  const [showChangelog, setShowChangelog] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="fixed inset-y-0 left-0 w-[230px] bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-12 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div className="w-7 h-7 rounded-xl bg-sky-500 flex items-center justify-center shadow-sm shadow-sky-500/30">
          <Wallet size={14} className="text-white" />
        </div>
        <span className="font-bold text-slate-900 dark:text-white tracking-tight">FinanceApp</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 h-9 px-3 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              <Icon
                size={15}
                className={cn(
                  "shrink-0",
                  active ? "text-sky-500" : "text-slate-400 dark:text-slate-500"
                )}
              />
              {label}
            </Link>
          );
        })}
        {currentUser?.isAdmin && (
          <Link
            href="/admin/users"
            className={cn(
              "flex items-center gap-3 h-9 px-3 rounded-lg text-sm font-medium transition-colors",
              pathname.startsWith("/admin")
                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            <ShieldCheck
              size={15}
              className={cn(
                "shrink-0",
                pathname.startsWith("/admin") ? "text-amber-500" : "text-slate-400 dark:text-slate-500"
              )}
            />
            Admin
          </Link>
        )}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg mb-0.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0 select-none">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
              {displayName}
            </p>
            {profile.email && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{profile.email}</p>
            )}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full h-8 px-3 rounded-lg text-sm text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
        >
          <LogOut size={14} className="shrink-0" />
          Sair da conta
        </button>

        {/* Version badge */}
        <button
          onClick={() => setShowChangelog(true)}
          className="mt-2 w-full flex justify-center"
        >
          <span className="text-[10px] text-slate-300 dark:text-slate-600 hover:text-sky-400 dark:hover:text-sky-500 transition-colors font-mono">
            v{CURRENT_VERSION}
          </span>
        </button>
      </div>

      <ChangelogModal open={showChangelog} onClose={() => setShowChangelog(false)} />
    </aside>
  );
}
