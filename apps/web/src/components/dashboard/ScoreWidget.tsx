"use client";
import Link from "next/link";
import { Activity } from "lucide-react";
import { useHealthScore } from "@/hooks/useHealthScore";
import { ScoreRing } from "@/components/score/ScoreRing";

export function ScoreWidget() {
  const { data: score, loading } = useHealthScore();

  if (loading) {
    return (
      <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 animate-pulse">
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-32 bg-slate-100 dark:bg-slate-800 rounded" />
          <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded" />
        </div>
      </div>
    );
  }

  if (!score) return null;

  return (
    <Link href="/score">
      <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm transition-all group">
        <ScoreRing score={score.total} tier={score.tier.name} size={72} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Activity size={13} className="text-emerald-500 shrink-0" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Saúde financeira</p>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {score.currentStreak > 0
              ? `${score.currentStreak} semana${score.currentStreak !== 1 ? "s" : ""} seguidas`
              : "Comece sua sequência hoje"}
          </p>
          <p className="text-xs text-sky-500 mt-1.5 group-hover:text-sky-600 transition-colors">
            Ver detalhes →
          </p>
        </div>
      </div>
    </Link>
  );
}
