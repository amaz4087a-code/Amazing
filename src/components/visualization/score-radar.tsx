"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface IndicatorEntry {
  indicator: string;
  label: string;
  score: number;
  fullMark: number;
}

interface ScoreRadarProps {
  scores: Record<string, number>;
  className?: string;
}

const LABEL_MAP: Record<string, string> = {
  accuracy: "准确性",
  rhythm: "节奏感",
  fluidity: "流畅度",
  explosiveness: "爆发力",
  extension: "伸展度",
  symmetry: "对称性",
  stability: "稳定性",
  coordination: "协调性",
  syncRate: "同步率",
  rangeOfMotion: "幅度",
  completeness: "完成度",
};

const ORDER = [
  "accuracy",
  "rhythm",
  "fluidity",
  "explosiveness",
  "extension",
  "symmetry",
  "stability",
  "coordination",
  "syncRate",
  "rangeOfMotion",
  "completeness",
];

export function ScoreRadar({ scores, className }: ScoreRadarProps) {
  const data: IndicatorEntry[] = ORDER.map((key) => ({
    indicator: key,
    label: LABEL_MAP[key] ?? key,
    score: scores[key] ?? 0,
    fullMark: 100,
  }));

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={350}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="label"
            fontSize={12}
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value: any) => [`${value} 分`, "得分"]}
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius)",
            }}
          />
          <Radar
            name="得分"
            dataKey="score"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
