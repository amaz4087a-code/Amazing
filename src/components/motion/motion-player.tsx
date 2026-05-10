"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { JointData, MotionFrameData } from "@/types/motion";
import { SkeletonViewer3D } from "./skeleton-viewer";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";

interface MotionPlayerProps {
  frames: MotionFrameData[];
  fps?: number;
  height?: string;
}

const END_SENTINEL = -1;

export function MotionPlayer({
  frames,
  fps = 30,
  height = "400px",
}: MotionPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const frameCount = frames.length;
  const effectiveIndex = currentIndex === END_SENTINEL ? 0 : currentIndex;
  const currentFrame = frames[effectiveIndex];

  // Playback logic
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= frameCount - 1) {
            return END_SENTINEL; // signal end
          }
          return prev + 1;
        });
      }, 1000 / fps);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, fps, frameCount]);

  // Handle end of playback (runs after the sentinel is committed)
  useEffect(() => {
    if (currentIndex === END_SENTINEL) {
      setIsPlaying(false);
      setCurrentIndex(0);
    }
  }, [currentIndex]);

  const togglePlay = useCallback(() => setIsPlaying((p) => !p), []);

  const goToStart = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(0);
  }, []);

  const goToEnd = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(frameCount - 1);
  }, [frameCount]);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setIsPlaying(false);
      setCurrentIndex(parseInt(e.target.value));
    },
    []
  );

  if (frameCount === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border bg-muted/30">
        <p className="text-muted-foreground">暂无帧数据</p>
      </div>
    );
  }

  const displayIndex = effectiveIndex + 1;

  return (
    <div className="space-y-4">
      <SkeletonViewer3D
        joints={currentFrame?.joints ?? []}
        height={height}
        showControls={true}
      />

      {/* Timeline */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={goToStart} title="跳到开头">
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={togglePlay}
          title={isPlaying ? "暂停" : "播放"}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        <Button variant="outline" size="icon" onClick={goToEnd} title="跳到结尾">
          <SkipForward className="h-4 w-4" />
        </Button>

        <input
          type="range"
          min={0}
          max={frameCount - 1}
          value={effectiveIndex}
          onChange={handleSliderChange}
          className="flex-1 cursor-pointer"
          aria-label="帧进度"
        />

        <span className="min-w-24 text-right text-sm text-muted-foreground">
          {displayIndex} / {frameCount}
        </span>
      </div>
    </div>
  );
}
