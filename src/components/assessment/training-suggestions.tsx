"use client";

import type { TrainingSuggestion } from "@/lib/assessment/types";

interface TrainingSuggestionsProps {
  suggestions: TrainingSuggestion[];
  className?: string;
}

const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

const priorityBadge: Record<string, string> = {
  high: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  medium:
    "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
  low: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
};

export function TrainingSuggestions({
  suggestions,
  className,
}: TrainingSuggestionsProps) {
  const sorted = [...suggestions].sort(
    (a, b) => (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99),
  );

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        所有指标表现良好，无需针对性训练。
      </p>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-4">
        {sorted.map((s, idx) => (
          <div key={idx} className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{s.area}</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium ${priorityBadge[s.priority] ?? priorityBadge.low}`}
                  >
                    {s.priority === "high"
                      ? "优先"
                      : s.priority === "medium"
                        ? "建议"
                        : "可选"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {s.suggestion}
                </p>
              </div>
            </div>

            {s.exercises.length > 0 && (
              <div className="mt-3 space-y-2">
                {s.exercises.map((ex, ei) => (
                  <div
                    key={ei}
                    className="rounded-md border bg-muted/30 px-3 py-2"
                  >
                    <p className="text-sm font-medium">{ex.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ex.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
