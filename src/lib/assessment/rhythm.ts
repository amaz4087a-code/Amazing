import type { JointData } from "@/types/motion";
import type { AlignmentResult } from "./types";

/**
 * FastDTW with Sakoe-Chiba Band constraint.
 * Window size = frameCount × windowRatio (default 10%).
 * Complexity: O(N × window) instead of O(N²).
 */
export function computeAlignment(
  standardFrames: { joints: JointData[] }[],
  userFrames: { joints: JointData[] }[],
  windowRatio = 0.3
): AlignmentResult {
  const n = standardFrames.length;
  const m = userFrames.length;
  // Window must be wide enough to reach from (0,0) to (n-1,m-1)
  const minWindow = Math.max(10, Math.abs(m - n) + 5);
  const windowSize = Math.max(minWindow, Math.floor(Math.max(n, m) * windowRatio));

  // Extract feature vectors (hip velocity magnitude)
  const stdFeatures = extractFeature(standardFrames);
  const usrFeatures = extractFeature(userFrames);

  // Initialize DTW matrix with Sakoe-Chiba Band
  const dtw: number[][] = Array.from({ length: n }, () =>
    Array(m).fill(Infinity)
  );
  dtw[0][0] = Math.abs(stdFeatures[0] - usrFeatures[0]);

  for (let i = 0; i < n; i++) {
    const jStart = Math.max(0, i - windowSize);
    const jEnd = Math.min(m - 1, i + windowSize);

    for (let j = jStart; j <= jEnd; j++) {
      if (i === 0 && j === 0) continue;

      const cost = Math.abs(stdFeatures[i] - usrFeatures[j]);
      const prev = Math.min(
        i > 0 ? dtw[i - 1][j] : Infinity,
        j > 0 ? dtw[i][j - 1] : Infinity,
        i > 0 && j > 0 ? dtw[i - 1][j - 1] : Infinity
      );
      dtw[i][j] = cost + prev;
    }
  }

  // Backtrace to find optimal path
  const path: [number, number][] = [];
  let i = n - 1;
  let j = m - 1;

  while (i > 0 || j > 0) {
    path.push([i, j]);

    const costs = [
      i > 0 ? dtw[i - 1][j] : Infinity,
      j > 0 ? dtw[i][j - 1] : Infinity,
      i > 0 && j > 0 ? dtw[i - 1][j - 1] : Infinity,
    ];

    const minVal = Math.min(...costs);
    // If all costs are Infinity (outside band), force diagonal move
    const minIdx = minVal === Infinity ? 2 : costs.indexOf(minVal);
    if (minIdx === 0) i--;
    else if (minIdx === 1) j--;
    else { i--; j--; }
  }
  path.push([0, 0]);
  path.reverse();

  // Build aligned pairs — clamp indices to prevent out-of-bounds
  const pairs = path.map(([si, ui]) => ({
    standardFrame: standardFrames[Math.min(si, standardFrames.length - 1)],
    userFrame: userFrames[Math.min(ui, userFrames.length - 1)],
  }));

  return {
    path,
    distance: dtw[n - 1][m - 1],
    pairs,
  };
}

/**
 * Extract hip velocity magnitude as feature for DTW alignment.
 */
function extractFeature(
  frames: { joints: JointData[] }[]
): number[] {
  const features: number[] = [];

  for (let i = 0; i < frames.length; i++) {
    const hip = frames[i].joints.find((j) => j.id === "hip_center");
    if (!hip) {
      features.push(0);
      continue;
    }

    if (i === 0) {
      features.push(0);
      continue;
    }

    const prevHip = frames[i - 1].joints.find((j) => j.id === "hip_center");
    if (!prevHip) {
      features.push(0);
      continue;
    }

    const dx = hip.pos.x - prevHip.pos.x;
    const dy = hip.pos.y - prevHip.pos.y;
    const dz = hip.pos.z - prevHip.pos.z;
    features.push(Math.sqrt(dx * dx + dy * dy + dz * dz));
  }

  return features;
}

/**
 * Compute rhythm score from DTW alignment quality.
 * A perfect diagonal path = perfect rhythm = 100.
 */
export function computeRhythmScore(
  path: [number, number][],
  standardLength: number,
  userLength: number
): number {
  if (path.length === 0) return 0;

  // Measure how diagonal the path is
  let diagonalCount = 0;
  for (let k = 1; k < path.length; k++) {
    const [pi, pj] = path[k];
    const [ppi, ppj] = path[k - 1];
    if (pi - ppi === 1 && pj - ppj === 1) {
      diagonalCount++;
    }
  }

  const diagonalRatio = diagonalCount / path.length;
  // Length deviation penalty
  const lengthRatio = Math.min(standardLength, userLength) / Math.max(standardLength, userLength);

  return Math.round((diagonalRatio * 0.6 + lengthRatio * 0.4) * 100);
}
