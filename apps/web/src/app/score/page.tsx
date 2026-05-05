"use client";
import { useHealthScore, useHealthScoreHistory, useBadges, useStreakFreeze } from "@/hooks/useHealthScore";
import { ScoreRing }          from "@/components/score/ScoreRing";
import { DimensionBar }       from "@/components/score/DimensionBar";
import { BadgeGrid }          from "@/components/score/BadgeGrid";
import { ScoreHistoryChart }  from "@/components/score/ScoreHistoryChart";
import { PageHeader }         from "@/components/ui/PageHeader";
import { Card }               from "@/components/ui/Card";
import { cn }                 from "@/lib/utils";

const DIMENSION_UNITS: Record<string, string> = {
  savings:   "%",
  budget:    "%",
  emergency: " meses",
  debt:      "%",
  streak:    " semanas",
};

const TIER_NAMES = ["Iniciante", "Básico", "Bom", "Ótimo", "Excelente"] as const;

export default function ScorePage() {
  const { data: score, loading, refetch } = useHealthScore();
  const history                           = useHealthScoreHistory();
  const badges                            = useBadges();
  const freeze                            = useStreakFreeze(refetch);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Saúde Financeira" subtitle="Seu índice de saúde financeira" />
        <div className="flex justify-center py-12">
          <p className="text-sm text-slate-400">Calculando pontuação...</p>
        </div>
      </div>
    );
  }

  if (!score) {
    return (
      <div className="space-y-6">
        <PageHeader title="Saúde Financeira" subtitle="Seu índice de saúde financeira" />
        <p className="text-sm text-slate-400">
          Registre algumas transações para calcular sua pontuação.
        </p>
      </div>
    );
  }

  const dimensions = [
    { key: "savings",   ...score.savings   },
    { key: "budget",    ...score.budget    },
    { key: "emergency", ...score.emergency },
    { key: "debt",      ...score.debt      },
    { key: "streak",    ...score.streak    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Saúde Financeira" subtitle="Seu índice de saúde financeira" />

      {/* Score ring + tiers */}
      <Card>
        <div className="flex flex-col items-center gap-4 py-2">
          <ScoreRing score={score.total} tier={score.tier.name} size={140} />

          {/* Tier pills */}
          <div className="flex gap-1.5 flex-wrap justify-center">
            {TIER_NAMES.map((tier) => (
              <span
                key={tier}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border",
                  score.tier.name === tier
                    ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                    : "border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500"
                )}
              >
                {tier}
              </span>
            ))}
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500">
            Sequência atual:{" "}
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {score.currentStreak} semana{score.currentStreak !== 1 ? "s" : ""}
            </span>
          </p>

          {score.streakFreezeAvailable && (
            <button
              onClick={() => freeze.use()}
              disabled={freeze.loading}
              className="text-xs text-sky-500 hover:text-sky-600 underline transition-colors disabled:opacity-50"
            >
              Usar proteção de sequência
            </button>
          )}
        </div>
      </Card>

      {/* Dimensions */}
      <Card>
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
          Dimensões
        </p>
        <div className="flex flex-col gap-4">
          {dimensions.map((d) => (
            <DimensionBar
              key={d.key}
              label={d.label}
              score={d.score}
              maxScore={d.maxScore}
              rawValue={d.rawValue}
              rawUnit={DIMENSION_UNITS[d.key] ?? ""}
            />
          ))}
        </div>
      </Card>

      {/* History chart */}
      {history.length > 1 && (
        <Card>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
            Histórico de pontuação
          </p>
          <ScoreHistoryChart history={history} />
        </Card>
      )}

      {/* Badges */}
      <Card>
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
          Conquistas
        </p>
        <BadgeGrid badges={badges} />
      </Card>
    </div>
  );
}
