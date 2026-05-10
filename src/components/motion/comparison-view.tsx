"use client";

import type { JointData } from "@/types/motion";
import { SkeletonViewer3D } from "./skeleton-viewer";

interface ComparisonViewProps {
  standardJoints: JointData[];
  userJoints: JointData[];
  highlightJoints?: Set<string>;
  deviationData?: Map<string, number>;
}

/**
 * Side-by-side comparison view with ghost overlay effect.
 * Left: Standard motion (semi-transparent grey ghost)
 * Right: User motion (colored, errors in red)
 */
export function ComparisonView({
  standardJoints,
  userJoints,
  highlightJoints,
  deviationData,
}: ComparisonViewProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Standard motion (ghost) */}
      <div>
        <p className="mb-2 text-center text-sm font-medium text-muted-foreground">
          标准动作
        </p>
        <SkeletonViewer3D
          joints={standardJoints}
          color="#94a3b8"
          opacity={0.5}
          showControls={false}
          height="350px"
        />
      </div>

      {/* User motion overlay on standard */}
      <div className="relative">
        <p className="mb-2 text-center text-sm font-medium text-muted-foreground">
          用户动作
        </p>
        <div className="relative">
          {/* Ghost overlay from standard */}
          <div className="absolute inset-0 pointer-events-none">
            <SkeletonViewer3D
              joints={standardJoints}
              color="#94a3b8"
              opacity={0.3}
              showControls={false}
              height="350px"
            />
          </div>
          {/* User skeleton */}
          <SkeletonViewer3D
            joints={userJoints}
            color="#3b82f6"
            highlightJoints={highlightJoints}
            deviationData={deviationData}
            showControls={false}
            height="350px"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Overlay comparison: standard and user in same space
 */
export function ComparisonOverlay({
  standardJoints,
  userJoints,
  highlightJoints,
  deviationData,
}: ComparisonViewProps) {
  return (
    <div>
      <p className="mb-2 text-center text-sm font-medium text-muted-foreground">
        叠加对比（灰色=标准 ｜ 蓝色=用户 ｜ 红色=偏差大）
      </p>
      <div className="relative">
        {/* Standard ghost */}
        <div className="absolute inset-0 pointer-events-none">
          <SkeletonViewer3D
            joints={standardJoints}
            color="#94a3b8"
            opacity={0.4}
            showControls={false}
            height="400px"
          />
        </div>
        {/* User */}
        <SkeletonViewer3D
          joints={userJoints}
          color="#3b82f6"
          highlightJoints={highlightJoints}
          deviationData={deviationData}
          showControls={true}
          height="400px"
        />
      </div>
    </div>
  );
}
