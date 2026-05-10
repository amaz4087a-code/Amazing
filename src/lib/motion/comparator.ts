import type { JointData, FrameComparisonResult, JointDeviation } from "@/types/motion";
import { normalizeJoints, euclideanDistance, getJointWeight } from "./normalizer";

/**
 * Compare a user's frame against a standard frame.
 *
 * Before comparison:
 * 1. Relocate both to hip_center origin
 * 2. Scale user to standard's skeleton proportions
 *
 * Then compute weighted Euclidean distance per joint.
 */
export function compareFrames(
  standardJoints: JointData[],
  userJoints: JointData[],
  selectedJointIds: Set<string>,
  standardThighLength: number
): FrameComparisonResult {
  // Normalize user joints to standard proportions
  const normalizedUser = normalizeJoints(userJoints, standardThighLength);
  const normalizedStandard = relocateJoints(standardJoints);

  const jointDeviations: JointDeviation[] = [];
  let totalWeightedDeviation = 0;
  let totalWeight = 0;

  for (const stdJoint of normalizedStandard) {
    if (!selectedJointIds.has(stdJoint.id)) continue;

    const userJoint = normalizedUser.find((j) => j.id === stdJoint.id);
    if (!userJoint || userJoint.confidence < 0.3) continue;

    const deviation = euclideanDistance(stdJoint.pos, userJoint.pos);
    const weight = getJointWeight(stdJoint.id);
    totalWeightedDeviation += deviation * weight;
    totalWeight += weight;

    jointDeviations.push({
      jointId: stdJoint.id,
      deviation,
      normalizedDeviation: normalizeDeviation(deviation),
    });
  }

  const avgDeviation = totalWeight > 0 ? totalWeightedDeviation / totalWeight : 0;
  const maxDeviation = jointDeviations.length > 0
    ? Math.max(...jointDeviations.map((d) => d.deviation))
    : 0;

  return {
    timestamp: 0,
    avgDeviation,
    maxDeviation,
    jointDeviations,
    score: computeAccuracyFromDeviation(avgDeviation),
  };
}

function relocateJoints(joints: JointData[]): JointData[] {
  const hip = joints.find((j) => j.id === "hip_center");
  if (!hip) return joints;
  return joints.map((j) => ({
    ...j,
    pos: {
      x: j.pos.x - hip.pos.x,
      y: j.pos.y - hip.pos.y,
      z: j.pos.z - hip.pos.z,
    },
  }));
}

/**
 * Map an average deviation (in meters after normalization) to a 0-100 score.
 * Deviation of 0 → 100, deviation >= 0.5m → 0
 */
function computeAccuracyFromDeviation(deviation: number): number {
  const score = Math.max(0, 100 - deviation * 200);
  return Math.round(score * 10) / 10;
}

/**
 * Normalize deviation to a 0-1 scale for visualization.
 */
function normalizeDeviation(deviation: number): number {
  return Math.min(1, deviation / 0.5);
}

/**
 * Compute standard motion thigh length (for normalization reference)
 */
export function computeStandardThighLength(
  standardFrames: { joints: JointData[] }[]
): number {
  if (standardFrames.length === 0) return 0.4; // fallback default

  const relocated = relocateJoints(standardFrames[0].joints);
  const hip = relocated.find((j) => j.id === "hip_center");
  const leftKnee = relocated.find((j) => j.id === "left_knee");
  const rightKnee = relocated.find((j) => j.id === "right_knee");

  if (!hip || !leftKnee || !rightKnee) return 0.4;

  const leftLen = euclideanDistance(hip.pos, leftKnee.pos);
  const rightLen = euclideanDistance(hip.pos, rightKnee.pos);
  return (leftLen + rightLen) / 2;
}
