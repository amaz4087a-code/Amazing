"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <h1 className="text-xl font-bold">出错了</h1>
      <p className="text-sm text-muted-foreground">
        {error.message || "发生了一个意外错误"}
      </p>
      <div className="flex gap-3">
        <Button onClick={() => reset()}>重试</Button>
        <Button variant="outline" onClick={() => (window.location.href = "/")}>
          返回首页
        </Button>
      </div>
    </div>
  );
}
