import type { BadgeItem } from "@/lib/healthScore";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

export function BadgeGrid({ badges }: { badges: BadgeItem[] }) {
  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);

  return (
    <div className="flex flex-col gap-4">
      {earned.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
            Conquistadas ({earned.length})
          </p>
          <div className="grid grid-cols-2 gap-2">
            {earned.map((badge) => (
              <div
                key={badge.id}
                className="border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg p-3"
              >
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{badge.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{badge.description}</p>
                {badge.earnedAt && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{fmtDate(badge.earnedAt)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {locked.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
            Em progresso ({locked.length})
          </p>
          <div className="grid grid-cols-2 gap-2">
            {locked.map((badge) => (
              <div
                key={badge.id}
                className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 opacity-60"
              >
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{badge.name}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{badge.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {badges.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-4">Nenhuma conquista ainda.</p>
      )}
    </div>
  );
}
