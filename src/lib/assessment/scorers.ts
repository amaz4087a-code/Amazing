import type { JointData, Vector3 } from "@/types/motion";
import type { IndicatorResult, AlignmentResult } from "./types";
import { euclideanDistance, getJointWeight } from "@/lib/motion/normalizer";
import { computeRhythmScore } from "./rhythm";

// ─── Helpers ────────────────────────────────────────────────────

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function getJointPos(joints: JointData[], id: string): Vector3 | null {
  return joints.find((j) => j.id === id)?.pos ?? null;
}

function vectorLen(v: Vector3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function diffVec(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function toScore(value: number, ideal: number, tolerance: number): number {
  const diff = Math.abs(value - ideal);
  return Math.max(0, Math.min(100, 100 - (diff / tolerance) * 100));
}

// ─── 1. Accuracy ───────────────────────────────────────────────

export function scoreAccuracy(
  pairs: { standardFrame: { joints: JointData[] }; userFrame: { joints: JointData[] } }[],
  selectedJointIds: Set<string>
): IndicatorResult {
  const perFrameScores: number[] = [];

  for (const { standardFrame, userFrame } of pairs) {
    let totalWeightedDev = 0;
    let totalWeight = 0;

    for (const joint of standardFrame.joints) {
      if (!selectedJointIds.has(joint.id)) continue;
      const uj = userFrame.joints.find((j) => j.id === joint.id);
      if (!uj || uj.confidence < 0.3) continue;

      const dev = euclideanDistance(joint.pos, uj.pos);
      const w = getJointWeight(joint.id);
      totalWeightedDev += dev * w;
      totalWeight += w;
    }

    const avgDev = totalWeight > 0 ? totalWeightedDev / totalWeight : 0;
    perFrameScores.push(Math.max(0, 100 - avgDev * 200));
  }

  return {
    score: Math.round(average(perFrameScores) * 10) / 10,
    details: { perFrameScores, frameCount: perFrameScores.length },
  };
}

// ─── 2. Rhythm (uses DTW path from alignment) ─────────────────

export function scoreRhythm(
  alignment: AlignmentResult,
  standardFrames: { joints: JointData[] }[],
  userFrames: { joints: JointData[] }[]
): IndicatorResult {
  const score = computeRhythmScore(alignment.path, standardFrames.length, userFrames.length);
  return {
    score,
    details: { dtwDistance: alignment.distance, pathLength: alignment.path.length },
  };
}

// ─── 3. Fluidity (jerk analysis) ──────────────────────────────

export function scoreFluidity(
  pairs: { standardFrame: { joints: JointData[] }; userFrame: { joints: JointData[] } }[],
  selectedJointIds: Set<string>
): IndicatorResult {
  const velocities: number[][] = [];

  for (let i = 1; i < pairs.length; i++) {
    const userJoints = pairs[i].userFrame.joints;
    const prevJoints = pairs[i - 1].userFrame.joints;
    const frameVelocities: number[] = [];

    for (const joint of userJoints) {
      if (!selectedJointIds.has(joint.id)) continue;
      const prev = prevJoints.find((j) => j.id === joint.id);
      if (!prev) continue;
      const vel = euclideanDistance(joint.pos, prev.pos);
      frameVelocities.push(vel);
    }

    if (frameVelocities.length > 0) {
      velocities.push(frameVelocities);
    }
  }

  // Compute jerk (acceleration change) from velocities
  const jerks: number[] = [];
  for (let i = 2; i < velocities.length; i++) {
    const jerk = Math.abs(
      average(velocities[i]) -
      2 * average(velocities[i - 1]) +
      average(velocities[i - 2])
    );
    jerks.push(jerk);
  }

  const avgJerk = jerks.length > 0 ? average(jerks) : 0;
  // Lower jerk = more fluid, max score at jerk = 0, min at jerk >= 0.5
  const score = Math.max(0, Math.min(100, 100 - avgJerk * 200));

  return {
    score: Math.round(score * 10) / 10,
    details: { avgJerk, sampleCount: jerks.length },
  };
}

// ─── 4. Explosiveness (velocity change rate) ──────────────────

export function scoreExplosiveness(
  pairs: { standardFrame: { joints: JointData[] }; userFrame: { joints: JointData[] } }[],
  selectedJointIds: Set<string>
): IndicatorResult {
  const userDVs: number[] = [];
  const stdDVs: number[] = [];

  for (let i = 2; i < pairs.length; i++) {
    // User dv/dt
    const uj = pairs[i].userFrame.joints;
    const uj1 = pairs[i - 1].userFrame.joints;
    const uj2 = pairs[i - 2].userFrame.joints;

    // Standard dv/dt
    const sj = pairs[i].standardFrame.joints;
    const sj1 = pairs[i - 1].standardFrame.joints;
    const sj2 = pairs[i - 2].standardFrame.joints;

    for (const joint of uj) {
      if (!selectedJointIds.has(joint.id)) continue;

      const v1 = uj1.find((j) => j.id === joint.id);
      const v2 = uj2.find((j) => j.id === joint.id);
      if (v1 && v2) {
        userDVs.push(euclideanDistance(joint.pos, v1.pos) - euclideanDistance(v1.pos, v2.pos));
      }

      const sv1 = sj1.find((j) => j.id === joint.id);
      const sv2 = sj2.find((j) => j.id === joint.id);
      if (sv1 && sv2) {
        stdDVs.push(euclideanDistance(sj.find((s) => s.id === joint.id)?.pos ?? joint.pos, sv1.pos) - euclideanDistance(sv1.pos, sv2.pos));
      }
    }
  }

  const avgUserDV = userDVs.length > 0 ? average(userDVs) : 0;
  const avgStdDV = stdDVs.length > 0 ? average(stdDVs) : 0;

  // Compare user explosiveness to standard
  const score = toScore(avgUserDV, avgStdDV, 0.5);

  return {
    score: Math.round(score * 10) / 10,
    details: { userAvgDV: avgUserDV, standardAvgDV: avgStdDV },
  };
}

// ─── 5. Extension (Range of Motion) ───────────────────────────

export function scoreExtension(
  pairs: { standardFrame: { joints: JointData[] }; userFrame: { joints: JointData[] } }[],
  selectedJointIds: Set<string>
): IndicatorResult {
  const getRange = (frames: { joints: JointData[] }[], jointId: string): number => {
    let maxDist = 0;
    let minDist = Infinity;
    const origin = frames[0]?.joints.find((j) => j.id === "hip_center")?.pos ?? { x: 0, y: 0, z: 0 };

    for (const frame of frames) {
      const j = frame.joints.find((j) => j.id === jointId);
      if (!j) continue;
      const dist = euclideanDistance(j.pos, origin);
      maxDist = Math.max(maxDist, dist);
      minDist = Math.min(minDist, dist);
    }

    return maxDist - minDist;
  };

  const stdFrames = pairs.map((p) => ({ joints: p.standardFrame.joints }));
  const usrFrames = pairs.map((p) => ({ joints: p.userFrame.joints }));
  const jointIds = [...selectedJointIds];
  let totalScore = 0;
  let count = 0;

  for (const jointId of jointIds) {
    const stdRom = getRange(stdFrames, jointId);
    const usrRom = getRange(usrFrames, jointId);
    if (stdRom > 0.01) {
      const ratio = Math.min(usrRom / stdRom, 1 / Math.min(usrRom / stdRom, 2));
      totalScore += ratio * 100;
      count++;
    }
  }

  return {
    score: count > 0 ? Math.round((totalScore / count) * 10) / 10 : 0,
    details: { jointCount: count },
  };
}

// ─── 6. Symmetry ──────────────────────────────────────────────

export function scoreSymmetry(
  pairs: { standardFrame: { joints: JointData[] }; userFrame: { joints: JointData[] } }[],
  selectedJointIds: Set<string>
): IndicatorResult {
  const pairs2: [string, string][] = [
    ["left_shoulder", "right_shoulder"],
    ["left_elbow", "right_elbow"],
    ["left_wrist", "right_wrist"],
    ["left_hip", "right_hip"],
    ["left_knee", "right_knee"],
    ["left_ankle", "right_ankle"],
  ];

  const symmetries: number[] = [];

  for (const [left, right] of pairs2) {
    if (!selectedJointIds.has(left) || !selectedJointIds.has(right)) continue;

    const leftDists: number[] = [];
    const rightDists: number[] = [];
    const hipPos = pairs[0]?.userFrame.joints.find((j) => j.id === "hip_center")?.pos ?? { x: 0, y: 0, z: 0 };

    for (const { userFrame } of pairs) {
      const lj = userFrame.joints.find((j) => j.id === left);
      const rj = userFrame.joints.find((j) => j.id === right);
      if (lj && rj) {
        leftDists.push(euclideanDistance(lj.pos, hipPos));
        rightDists.push(euclideanDistance(rj.pos, hipPos));
      }
    }

    if (leftDists.length > 0) {
      const avgDiff = average(
        leftDists.map((ld, i) => Math.abs(ld - (rightDists[i] || 0)))
      );
      symmetries.push(Math.max(0, 100 - avgDiff * 200));
    }
  }

  return {
    score: symmetries.length > 0 ? Math.round(average(symmetries) * 10) / 10 : 50,
    details: { pairCount: symmetries.length, scores: symmetries },
  };
}

// ─── 7. Stability (COM variance) ──────────────────────────────

export function scoreStability(
  pairs: { standardFrame: { joints: JointData[] }; userFrame: { joints: JointData[] } }[],
  selectedJointIds: Set<string>
): IndicatorResult {
  if (!selectedJointIds.has("hip_center") || !selectedJointIds.has("chest")) {
    return { score: 0, details: { ignored: true, msg: "core joints excluded from selection" } };
  }

  const comPositions: Vector3[] = [];

  for (const { userFrame } of pairs) {
    const hip = userFrame.joints.find((j) => j.id === "hip_center");
    const chest = userFrame.joints.find((j) => j.id === "chest");
    if (hip && chest) {
      comPositions.push({
        x: (hip.pos.x + chest.pos.x) / 2,
        y: (hip.pos.y + chest.pos.y) / 2,
        z: (hip.pos.z + chest.pos.z) / 2,
      });
    }
  }

  if (comPositions.length === 0) {
    return { score: 50, details: { msg: "insufficient data" } };
  }

  const avgX = average(comPositions.map((p) => p.x));
  const avgY = average(comPositions.map((p) => p.y));
  const avgZ = average(comPositions.map((p) => p.z));

  const variance = average(
    comPositions.map((p) => {
      const dx = p.x - avgX;
      const dy = p.y - avgY;
      const dz = p.z - avgZ;
      return dx * dx + dy * dy + dz * dz;
    })
  );

  const score = Math.max(0, Math.min(100, 100 - variance * 500));

  return {
    score: Math.round(score * 10) / 10,
    details: { comVariance: variance, sampleCount: comPositions.length },
  };
}

// ─── 8. Coordination (inter-joint correlation) ────────────────

export function scoreCoordination(
  pairs: { standardFrame: { joints: JointData[] }; userFrame: { joints: JointData[] } }[],
  selectedJointIds: Set<string>
): IndicatorResult {
  const jointIds = [...selectedJointIds].filter(
    (id) => id !== "hip_center" && id !== "spine" && id !== "chest"
  );

  if (jointIds.length < 2) {
    return { score: 50, details: { msg: "insufficient joints" } };
  }

  // Simple coordination: measure pairwise correlation of joint distances from origin
  const correlations: number[] = [];

  for (let a = 0; a < jointIds.length; a++) {
    for (let b = a + 1; b < jointIds.length; b++) {
      const distsA: number[] = [];
      const distsB: number[] = [];
      const origin = { x: 0, y: 0, z: 0 };

      for (const { userFrame } of pairs) {
        const ja = userFrame.joints.find((j) => j.id === jointIds[a]);
        const jb = userFrame.joints.find((j) => j.id === jointIds[b]);
        if (ja && jb) {
          distsA.push(euclideanDistance(ja.pos, origin));
          distsB.push(euclideanDistance(jb.pos, origin));
        }
      }

      if (distsA.length < 3) continue;

      // Simple Pearson correlation approximation
      const meanA = average(distsA);
      const meanB = average(distsB);
      let num = 0, denA = 0, denB = 0;

      for (let i = 0; i < distsA.length; i++) {
        const da = distsA[i] - meanA;
        const db = distsB[i] - meanB;
        num += da * db;
        denA += da * da;
        denB += db * db;
      }

      const denom = Math.sqrt(denA * denB);
      if (denom > 0.001) {
        correlations.push(Math.abs(num / denom) * 100);
      }
    }
  }

  return {
    score: correlations.length > 0
      ? Math.round(average(correlations) * 10) / 10
      : 50,
    details: { pairCount: correlations.length },
  };
}

// ─── 9. Sync Rate ─────────────────────────────────────────────

export function scoreSyncRate(
  pairs: { standardFrame: { joints: JointData[] }; userFrame: { joints: JointData[] } }[],
  selectedJointIds: Set<string>
): IndicatorResult {
  const hipId = "hip_center";
  if (!selectedJointIds.has(hipId)) {
    return { score: 50, details: { msg: "hip not selected" } };
  }

  // Compare velocity zero-crossings (beat detection)
  const stdVelocities: number[] = [];
  const usrVelocities: number[] = [];

  for (let i = 1; i < pairs.length; i++) {
    const stdHip = pairs[i].standardFrame.joints.find((j) => j.id === hipId);
    const stdHipPrev = pairs[i - 1].standardFrame.joints.find((j) => j.id === hipId);
    const usrHip = pairs[i].userFrame.joints.find((j) => j.id === hipId);
    const usrHipPrev = pairs[i - 1].userFrame.joints.find((j) => j.id === hipId);

    if (stdHip && stdHipPrev) {
      stdVelocities.push(euclideanDistance(stdHip.pos, stdHipPrev.pos));
    }
    if (usrHip && usrHipPrev) {
      usrVelocities.push(euclideanDistance(usrHip.pos, usrHipPrev.pos));
    }
  }

  // Find beat positions (local maxima)
  const findBeats = (v: number[]): number[] => {
    const beats: number[] = [];
    for (let i = 1; i < v.length - 1; i++) {
      if (v[i] > v[i - 1] && v[i] > v[i + 1] && v[i] > average(v) * 1.2) {
        beats.push(i);
      }
    }
    return beats;
  };

  const stdBeats = findBeats(stdVelocities);
  const usrBeats = findBeats(usrVelocities);

  // Count how many user beats align with standard beats (within 3 frames)
  let matchCount = 0;
  for (const sb of stdBeats) {
    if (usrBeats.some((ub) => Math.abs(ub - sb) <= 3)) {
      matchCount++;
    }
  }

  const beatScore = stdBeats.length > 0
    ? (matchCount / Math.max(stdBeats.length, usrBeats.length)) * 100
    : 50;

  return {
    score: Math.round(beatScore * 10) / 10,
    details: { stdBeats: stdBeats.length, usrBeats: usrBeats.length, matchCount },
  };
}

// ─── 10. Range of Motion (amplitude) ──────────────────────────

export function scoreRangeOfMotion(
  pairs: { standardFrame: { joints: JointData[] }; userFrame: { joints: JointData[] } }[],
  selectedJointIds: Set<string>
): IndicatorResult {
  const jointIds = [...selectedJointIds].filter((id) => id !== "hip_center");

  const computeAmplitude = (frames: { joints: JointData[] }[], jointId: string): number => {
    let minY = Infinity, maxY = -Infinity;
    const origin = frames[0]?.joints.find((j) => j.id === "hip_center")?.pos ?? { x: 0, y: 0, z: 0 };

    for (const frame of frames) {
      const j = frame.joints.find((j) => j.id === jointId);
      if (!j) continue;
      // Relative Y displacement
      const relY = j.pos.y - origin.y;
      minY = Math.min(minY, relY);
      maxY = Math.max(maxY, relY);
    }

    return maxY - minY;
  };

  const stdFrames = pairs.map((p) => ({ joints: p.standardFrame.joints }));
  const usrFrames = pairs.map((p) => ({ joints: p.userFrame.joints }));
  let totalScore = 0;
  let count = 0;

  for (const jointId of jointIds) {
    const stdAmp = computeAmplitude(stdFrames, jointId);
    const usrAmp = computeAmplitude(usrFrames, jointId);
    if (stdAmp > 0.01) {
      const ratio = Math.min(usrAmp / stdAmp, stdAmp / usrAmp);
      totalScore += Math.max(0, ratio * 100);
      count++;
    }
  }

  return {
    score: count > 0 ? Math.round((totalScore / count) * 10) / 10 : 50,
    details: { jointCount: count },
  };
}

// ─── 11. Completeness ─────────────────────────────────────────

export function scoreCompleteness(
  pairs: { standardFrame: { joints: JointData[] }; userFrame: { joints: JointData[] } }[],
  selectedJointIds: Set<string>,
  threshold = 0.3
): IndicatorResult {
  let completedFrames = 0;

  for (const { standardFrame, userFrame } of pairs) {
    let allJointsFound = true;

    for (const joint of standardFrame.joints) {
      if (!selectedJointIds.has(joint.id)) continue;
      const uj = userFrame.joints.find((j) => j.id === joint.id);
      if (!uj || uj.confidence < 0.3) {
        allJointsFound = false;
        break;
      }
      const dev = euclideanDistance(joint.pos, uj.pos);
      if (dev > threshold) {
        allJointsFound = false;
        break;
      }
    }

    if (allJointsFound) completedFrames++;
  }

  const score = pairs.length > 0
    ? (completedFrames / pairs.length) * 100
    : 0;

  return {
    score: Math.round(score * 10) / 10,
    details: { completedFrames, totalFrames: pairs.length },
  };
}
