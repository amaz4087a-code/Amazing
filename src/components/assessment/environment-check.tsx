"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Camera } from "lucide-react";

type CheckState = "pending" | "pass" | "warn" | "fail";

interface CheckItem {
  label: string;
  state: CheckState;
  message?: string;
}

export function EnvironmentCheck({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [checks, setChecks] = useState<CheckItem[]>([
    { label: "摄像头访问权限", state: "pending" },
    { label: "光照条件", state: "pending" },
    { label: "全身入镜", state: "pending" },
    { label: "背景环境", state: "pending" },
  ]);
  const [cameraActive, setCameraActive] = useState(false);
  const [allPassed, setAllPassed] = useState(false);

  const updateCheck = useCallback(
    (index: number, update: Partial<CheckItem>) => {
      setChecks((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], ...update };
        return next;
      });
    },
    []
  );

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      updateCheck(0, { state: "pass" });

      // Simulate environment checks after camera starts
      setTimeout(() => runChecks(), 1500);
    } catch {
      updateCheck(0, {
        state: "fail",
        message: "无法访问摄像头，请检查摄像头权限设置",
      });
    }
  }

  function runChecks() {
    // In a real implementation, these would use MediaPipe Pose analysis
    // For now, simulate checks with realistic conditions

    // Lighting check: would read from video frame brightness
    updateCheck(1, { state: "pass", message: "光照充足" });

    // Full body check: would check if all key joints are visible
    updateCheck(2, { state: "pass", message: "全身已入镜" });

    // Background check: would analyze background complexity
    updateCheck(3, { state: "pass", message: "背景清晰，无反光" });

    setTimeout(() => setAllPassed(true), 500);
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }

  const stateIcon = (state: CheckState) => {
    switch (state) {
      case "pass":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "warn":
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case "fail":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">环境检测</h2>
        <p className="text-sm text-muted-foreground">
          在开始测评前，请确保以下环境条件满足要求
        </p>
      </div>

      {/* Camera preview */}
      <div className="relative overflow-hidden rounded-lg bg-black">
        {cameraActive ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-64 w-full object-cover"
          />
        ) : (
          <div className="flex h-64 items-center justify-center">
            <Camera className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Check list */}
      <div className="space-y-3">
        {checks.map((check, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div className="flex items-center gap-3">
              {stateIcon(check.state)}
              <div>
                <p className="text-sm font-medium">{check.label}</p>
                {check.message && (
                  <p className="text-xs text-muted-foreground">
                    {check.message}
                  </p>
                )}
              </div>
            </div>
            <Badge
              variant={
                check.state === "pass"
                  ? "secondary"
                  : check.state === "pending"
                  ? "outline"
                  : "destructive"
              }
            >
              {check.state === "pass"
                ? "正常"
                : check.state === "pending"
                ? "待检测"
                : "异常"}
            </Badge>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {!cameraActive ? (
          <Button onClick={startCamera} className="flex-1">
            <Camera className="mr-2 h-4 w-4" />
            启动摄像头检测
          </Button>
        ) : (
          <>
            {allPassed ? (
              <Button onClick={onComplete} className="flex-1">
                开始测评
              </Button>
            ) : (
              <Button disabled className="flex-1">
                检测中...
              </Button>
            )}
            <Button variant="outline" onClick={stopCamera}>
              关闭摄像头
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
