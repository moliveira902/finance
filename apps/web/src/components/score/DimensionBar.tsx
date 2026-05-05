interface Props {
  label:    string;
  score:    number;
  maxScore: number;
  rawValue: number;
  rawUnit:  string;
}

export function DimensionBar({ label, score, maxScore, rawValue, rawUnit }: Props) {
  const pct   = Math.round((score / maxScore) * 100);
  const color = pct >= 80 ? "#1D9E75" : pct >= 50 ? "#639922" : pct >= 30 ? "#BA7517" : "#E24B4A";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
          {score}/{maxScore} pts
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-slate-400 dark:text-slate-500">
        {rawValue.toFixed(1)}{rawUnit}
      </span>
    </div>
  );
}
