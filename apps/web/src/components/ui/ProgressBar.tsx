"use client";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value:     number;
  max:       number;
  className?: string;
}

export function ProgressBar({ value, max, className }: ProgressBarProps) {
  const pct  = Math.min(100, Math.round((value / max) * 100));
  const fill = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-400" : "bg-emerald-500";

  return (
    <div className={cn("w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", fill)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
