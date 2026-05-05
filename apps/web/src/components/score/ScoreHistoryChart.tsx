import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { HealthScoreHistoryEntry } from "@/lib/healthScore";

function fmtMonth(yyyyMM: string) {
  const [y, m] = yyyyMM.split("-");
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString("pt-BR", { month: "short" });
}

const TOOLTIP_STYLE = {
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  fontSize: 12,
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
};

export function ScoreHistoryChart({ history }: { history: HealthScoreHistoryEntry[] }) {
  const data = [...history]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((h) => ({
      month: fmtMonth(h.month),
      score: h.score,
    }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value) => [`${value}/100`, "Pontuação"]}
        />
        <ReferenceLine
          y={75} stroke="#1D9E75" strokeDasharray="3 3"
          label={{ value: "Ótimo", fontSize: 10, fill: "#1D9E75", position: "insideTopRight" }}
        />
        <ReferenceLine
          y={60} stroke="#639922" strokeDasharray="3 3"
          label={{ value: "Bom", fontSize: 10, fill: "#639922", position: "insideTopRight" }}
        />
        <Line
          type="monotone" dataKey="score"
          stroke="#1D9E75" strokeWidth={2}
          dot={{ r: 3, fill: "#1D9E75" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
