interface Props {
  score: number;
  tier:  string;
  size?: number;
}

export function ScoreRing({ score, tier, size = 120 }: Props) {
  const r            = size / 2 - 8;
  const circumference = 2 * Math.PI * r;
  const offset        = circumference - (circumference * score) / 100;

  const color =
    score >= 90 ? "#1D9E75"
    : score >= 75 ? "#1D9E75"
    : score >= 60 ? "#639922"
    : score >= 40 ? "#BA7517"
    : "#E24B4A";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="#e2e8f0" strokeWidth={8}
        className="dark:stroke-slate-700"
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.3s ease" }}
      />
      <text
        x={size / 2} y={size / 2 - size * 0.1}
        textAnchor="middle" dominantBaseline="central"
        fontSize={size * 0.26} fontWeight={600}
        fill="currentColor"
        style={{ fill: "var(--tw-text-opacity, 1)" }}
        className="fill-slate-900 dark:fill-white"
      >
        {score}
      </text>
      <text
        x={size / 2} y={size / 2 + size * 0.18}
        textAnchor="middle" dominantBaseline="central"
        fontSize={size * 0.1}
        className="fill-slate-400 dark:fill-slate-500"
      >
        {tier}
      </text>
    </svg>
  );
}
