"use client";

import type { MotionFrameData } from "@/types/motion";
import { MotionPlayer } from "@/components/motion/motion-player";

interface MotionDetailClientProps {
  frames: MotionFrameData[];
  fps: number;
}

export function MotionDetailClient({ frames, fps }: MotionDetailClientProps) {
  return (
    <div className="space-y-3">
      <MotionPlayer
        frames={frames}
        fps={fps}
        height="500px"
      />
    </div>
  );
}
