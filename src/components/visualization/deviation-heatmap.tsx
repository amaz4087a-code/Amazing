"use client";

import type { FeedbackItem } from "@/lib/assessment/types";

interface DeviationHeatmapProps {
  jointDeviations: Record<string, number>;
  feedbackItems: FeedbackItem[];
  className?: string;
}

const JOINT_LABELS: Record<string, string> = {
  head: "头",
  neck: "颈",
  chest: "胸",
  spine: "脊柱",
  hip_center: "髋",
  left_shoulder: "左肩",
  right_shoulder: "右肩",
  left_elbow: "左肘",
  right_elbow: "右肘",
  left_wrist: "左腕",
  right_wrist: "右腕",
  left_hand: "左手",
  right_hand: "右手",
  left_hip: "左髋",
  right_hip: "右髋",
  left_knee: "左膝",
  right_knee: "右膝",
  left_ankle: "左踝",
  right_ankle: "右踝",
  left_foot: "左脚",
  right_foot: "右脚",
};

function devColor(dev: number): string {
  if (dev <= 0.03) return "bg-green-500/20 text-green-700 dark:text-green-300";
  if (dev <= 0.06) return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300";
  if (dev <= 0.10) return "bg-orange-500/20 text-orange-700 dark:text-orange-300";
  return "bg-red-500/20 text-red-700 dark:text-red-300";
}

function devLabel(dev: number): string {
  return `${(dev * 100).toFixed(1)}cm`;
}

export function DeviationHeatmap({
  jointDeviations,
  className,
}: DeviationHeatmapProps) {
  const entries = Object.entries(jointDeviations)
    .filter(([id]) => JOINT_LABELS[id])
    .sort(([a], [b]) => (JOINT_LABELS[a] ?? a).localeCompare(JOINT_LABELS[b] ?? b));

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">暂无关节偏差数据</p>
    );
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
        {entries.map(([jointId, dev]) => (
          <div
            key={jointId}
            className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium ${devColor(dev)}`}
          >
            <span>{JOINT_LABELS[jointId] ?? jointId}</span>
            <span className="font-mono">{devLabel(dev)}</span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-green-500/30" /> ≤ 3cm
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-yellow-500/30" /> 3–6cm
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-orange-500/30" /> 6–10cm
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-red-500/30" /> &gt; 10cm
        </span>
      </div>
    </div>
  );
}
