"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <h1 className="text-xl font-bold">出错了</h1>
      <p className="text-sm text-muted-foreground">
        {error.message || "处理请求时发生错误"}
      </p>
      <Button onClick={() => reset()}>重试</Button>
    </div>
  );
}
