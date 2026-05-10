"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function AssessmentDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <h1 className="text-xl font-bold">加载失败</h1>
      <p className="text-sm text-muted-foreground">
        {error.message || "无法加载测评数据"}
      </p>
      <Button onClick={() => reset()}>重试</Button>
    </div>
  );
}
