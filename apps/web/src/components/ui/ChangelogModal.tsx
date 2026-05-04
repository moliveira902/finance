"use client";
import { useEffect, useRef } from "react";
import { X, Tag, CheckCircle } from "lucide-react";
import { CHANGELOG } from "@/lib/changelog";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ChangelogModal({ open, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Panel */}
      <div
        ref={ref}
        className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <Tag size={16} className="text-sky-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Novidades</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Changelog list */}
        <div className="overflow-y-auto px-6 py-5 space-y-8">
          {CHANGELOG.map((entry, i) => (
            <div key={entry.version}>
              {/* Version header */}
              <div className="flex items-center gap-3 mb-3">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  i === 0
                    ? "bg-sky-500 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                }`}>
                  v{entry.version}
                </span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {entry.title}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto shrink-0">
                  {new Date(entry.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>

              {/* Items */}
              <ul className="space-y-2">
                {entry.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-400">
                    <CheckCircle size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>

              {i < CHANGELOG.length - 1 && (
                <div className="mt-6 border-t border-slate-100 dark:border-slate-800" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
