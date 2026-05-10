"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Camera,
  CameraOff,
  Circle,
  Square,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import {
  usePoseDetection,
  type PoseResult,
} from "@/hooks/use-pose-detection";
import type { JointData, MotionFrameData } from "@/types/motion";
import { SkeletonViewer3D } from "@/components/motion/skeleton-viewer";

interface LiveAssessmentViewProps {
  sessionId: string;
  standardFrames?: MotionFrameData[];
  standardFps?: number;
}

export function LiveAssessmentView({
  sessionId,
  standardFrames = [],
  standardFps = 30,
}: LiveAssessmentViewProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const displayVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordedFrames, setRecordedFrames] = useState<JointData[][]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const jointsRef = useRef<JointData[]>([]);

  // Standard demo auto-playback
  const [demoFrameIndex, setDemoFrameIndex] = useState(0);
  const demoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (cameraOn && standardFrames.length > 1) {
      demoIntervalRef.current = setInterval(() => {
        setDemoFrameIndex((prev) => (prev + 1) % standardFrames.length);
      }, 1000 / standardFps);
    } else {
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current);
        demoIntervalRef.current = null;
      }
      setDemoFrameIndex(0);
    }

    return () => {
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    };
  }, [cameraOn, standardFrames.length, standardFps]);

  // ─── Pose detection callback ──────────────────────────────────────
  const onFrame = useCallback(
    (result: PoseResult) => {
      jointsRef.current = result.joints;

      // Draw skeleton on canvas
      drawSkeleton(canvasRef.current, result.joints);

      // Record frame if recording
      if (recording) {
        setRecordedFrames((prev) => [...prev, result.joints]);
        setFrameCount((c) => c + 1);
      }
    },
    [recording],
  );

  const pose = usePoseDetection({
    onFrame,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  // ─── Attach stream to <video> after DOM is committed ──────────────
  useEffect(() => {
    if (cameraOn && streamRef.current && displayVideoRef.current) {
      displayVideoRef.current.srcObject = streamRef.current;
    }
  }, [cameraOn]);

  // ─── Camera toggle ────────────────────────────────────────────────
  const handleCamera = async () => {
    if (cameraOn) {
      if (displayVideoRef.current) {
        displayVideoRef.current.srcObject = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      pose.stopCamera();
      pose.stopDetection();
      setCameraOn(false);
      clearCanvas(canvasRef.current);
    } else {
      const ok = await pose.startCamera();
      if (ok) {
        streamRef.current = pose.streamRef.current;
        // Attach stream to display video synchronously (avoids race on mobile)
        if (displayVideoRef.current && streamRef.current) {
          displayVideoRef.current.srcObject = streamRef.current;
        }
        setCameraOn(true);
        // Detection starts after a brief moment for camera warm-up
        setTimeout(() => pose.startDetection(), 300);
      }
    }
  };

  // ─── Recording toggle ─────────────────────────────────────────────
  const handleStartRecording = () => {
    setRecordedFrames([]);
    setFrameCount(0);
    setSaved(false);
    setRecording(true);
  };

  const handleStopRecording = () => {
    setRecording(false);
  };

  // ─── Save frames to server ────────────────────────────────────────
  const handleSave = async () => {
    if (recordedFrames.length === 0) return;
    setSaving(true);

    try {
      // Save frames in batches of 50
      const batchSize = 50;
      const maxRetries = 3;
      for (let i = 0; i < recordedFrames.length; i += batchSize) {
        const batch = recordedFrames.slice(i, i + batchSize);

        let lastErr: Error | null = null;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            const res = await fetch(`/api/assessment/${sessionId}/frames`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                frames: batch.map((joints, idx) => ({
                  frameIndex: i + idx,
                  timestamp: Date.now() + (i + idx) * 33,
                  joints,
                })),
              }),
            });

            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || `保存失败 (${res.status})`);
            }

            lastErr = null;
            break; // success
          } catch (e) {
            lastErr = e instanceof Error ? e : new Error("未知错误");
            if (attempt < maxRetries - 1) {
              await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
            }
          }
        }

        if (lastErr) throw lastErr;
      }

      setSaved(true);
      router.refresh();
    } catch (err) {
      console.error("Failed to save frames:", err);
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const currentDemoJoints =
    standardFrames.length > 0
      ? standardFrames[demoFrameIndex]?.joints ?? []
      : [];

  return (
    <div className="space-y-4">
      {/* Camera + Standard Demo */}
      {cameraOn ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Left: Camera feed */}
          <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
            <video
              ref={displayVideoRef}
              className="absolute inset-0 h-full w-full object-contain"
              autoPlay
              muted
              playsInline
            />
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              className="absolute inset-0 h-full w-full object-contain"
            />
          </div>

          {/* Right: Standard demo */}
          <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
            {standardFrames.length > 0 ? (
              <SkeletonViewer3D
                joints={currentDemoJoints}
                height="100%"
                showControls={false}
                color="#FFB629"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">暂无示范数据</p>
              </div>
            )}
            <div className="absolute top-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white">
              标准示范
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex aspect-video max-w-lg items-center justify-center rounded-lg border bg-muted/30">
          <div className="text-center">
            <Camera className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <p className="mt-2 text-sm text-muted-foreground">
              点击下方按钮打开摄像头
            </p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          variant={cameraOn ? "destructive" : "default"}
          onClick={handleCamera}
          disabled={!pose.isReady}
        >
          {cameraOn ? (
            <>
              <CameraOff className="mr-2 h-4 w-4" /> 关闭摄像头
            </>
          ) : (
            <>
              <Camera className="mr-2 h-4 w-4" /> 打开摄像头
            </>
          )}
        </Button>

        {cameraOn && !recording && !saved && (
          <Button onClick={handleStartRecording} variant="secondary">
            <Circle className="mr-2 h-4 w-4 fill-red-500 text-red-500" />
            开始录制
          </Button>
        )}

        {recording && (
          <Button onClick={handleStopRecording} variant="destructive">
            <Square className="mr-2 h-4 w-4" />
            停止录制
          </Button>
        )}
      </div>

      {/* Status */}
      {cameraOn && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-center gap-6 text-sm">
              <span>
                摄像头:{" "}
                <span className="font-medium text-green-500">已连接</span>
              </span>
              <span>
                录制帧数:{" "}
                <span
                  className={`font-medium tabular-nums ${recording ? "text-red-500" : ""}`}
                >
                  {frameCount}
                </span>
              </span>
              {!pose.isReady && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  加载模型中...
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save */}
      {!recording && recordedFrames.length > 0 && !saved && (
        <div className="text-center">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {saving
              ? `保存中 (${recordedFrames.length} 帧)...`
              : `保存 ${recordedFrames.length} 帧到服务器`}
          </Button>
        </div>
      )}

      {saved && (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            已保存 {recordedFrames.length} 帧
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Canvas drawing helpers ────────────────────────────────────────────

const BONES: [string, string][] = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["left_wrist", "left_hand"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["right_wrist", "right_hand"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["left_ankle", "left_foot"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
  ["right_ankle", "right_foot"],
  ["hip_center", "spine"],
  ["spine", "chest"],
  ["chest", "neck"],
  ["neck", "head"],
  ["chest", "left_shoulder"],
  ["chest", "right_shoulder"],
  ["hip_center", "left_hip"],
  ["hip_center", "right_hip"],
];

function drawSkeleton(
  canvas: HTMLCanvasElement | null,
  joints: JointData[],
) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, 640, 480);

  // Don't fill — video shows through transparent background

  if (joints.length === 0) return;

  // Map joint positions to canvas coordinates
  const posMap = new Map<string, { x: number; y: number }>();
  for (const j of joints) {
    const cx = (j.pos.x / 1.5 + 0.5) * 640;
    const cy = (0.5 - j.pos.y / 1.5) * 480;
    posMap.set(j.id, { x: cx, y: cy });
  }

  // Draw bones
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 3;
  for (const [a, b] of BONES) {
    const pa = posMap.get(a);
    const pb = posMap.get(b);
    if (pa && pb) {
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }
  }

  // Draw joints
  const jointRadius = 4;
  for (const [, pos] of posMap) {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, jointRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#60a5fa";
    ctx.fill();
  }
}

function clearCanvas(canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, 640, 480);
}
