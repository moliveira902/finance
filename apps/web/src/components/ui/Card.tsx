"use client";
import { cn } from "@/lib/utils";

interface CardProps {
  children:  React.ReactNode;
  className?: string;
  onClick?:  () => void;
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "@container",
        "bg-white dark:bg-slate-800/60 dark:border-slate-700/60",
        "rounded-2xl border border-slate-100 shadow-sm",
        "p-3 @[180px]:p-4 @sm:p-6 overflow-hidden",
        onClick && "cursor-pointer hover:shadow-md hover:border-slate-200 dark:hover:border-slate-600 transition-all",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider", className)}>
      {children}
    </p>
  );
}

export function CardValue({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-xs @[130px]:text-sm @[200px]:text-base @[260px]:text-xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums leading-tight break-all", className)}>
      {children}
    </p>
  );
}
