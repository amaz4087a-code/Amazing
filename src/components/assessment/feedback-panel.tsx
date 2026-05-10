"use client";

import type { FeedbackItem } from "@/lib/assessment/types";

interface FeedbackPanelProps {
  items: FeedbackItem[];
  className?: string;
}

const severityIcon: Record<string, string> = {
  high: "🔴",
  medium: "🟡",
  low: "🟢",
};

const severityBorder: Record<string, string> = {
  high: "border-red-500/40 bg-red-500/5",
  medium: "border-yellow-500/40 bg-yellow-500/5",
  low: "border-green-500/40 bg-green-500/5",
};

export function FeedbackPanel({ items, className }: FeedbackPanelProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        所有关节偏差均在合理范围内，动作表现良好。
      </p>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div
            key={idx}
            className={`rounded-lg border p-3 ${severityBorder[item.severity] ?? severityBorder.low}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base">
                  {severityIcon[item.severity] ?? "🟢"}
                </span>
                <div>
                  <span className="text-sm font-medium">{item.bodyPart}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {item.issue}
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {item.description}
            </p>
            <p className="mt-1 text-sm">
              <span className="font-medium">建议: </span>
              {item.suggestion}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
