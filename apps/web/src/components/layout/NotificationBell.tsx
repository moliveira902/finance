"use client";
import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/useHealthScore";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export function NotificationBell() {
  const [open, setOpen]       = useState(false);
  const { data, unread, markRead } = useNotifications();
  const ref                   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Notificações"
      >
        <Bell size={18} className="text-slate-500 dark:text-slate-400" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Notificações</p>
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
            {data.length === 0 ? (
              <p className="text-sm text-slate-400 p-4 text-center">Nenhuma notificação</p>
            ) : (
              data.slice(0, 15).map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                    n.status === "unread" ? "bg-sky-50/60 dark:bg-sky-950/20" : ""
                  }`}
                >
                  <p className="text-sm leading-snug text-slate-700 dark:text-slate-300 line-clamp-2">
                    {n.message.split("\n")[0]}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{fmtDate(n.createdAt)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
