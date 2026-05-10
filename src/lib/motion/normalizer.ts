import type { JointData, Vector3 } from "@/types/motion";
import { JOINTS } from "@/config/joints";

/**
 * Relocation: Translate all joint positions so hip_center is at origin (0,0,0).
 */
export function relocateJoints(joints: JointData[]): JointData[] {
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
 * Calculate the thigh (femur) length from hip_center to knee.
 */
export function calcThighLength(joints: JointData[]): number {
  const hip = joints.find((j) => j.id === "hip_center");
  const leftKnee = joints.find((j) => j.id === "left_knee");
  const rightKnee = joints.find((j) => j.id === "right_knee");

  if (!hip || !leftKnee || !rightKnee) return 1;

  const leftLen = euclideanDistance(hip.pos, leftKnee.pos);
  const rightLen = euclideanDistance(hip.pos, rightKnee.pos);
  return (leftLen + rightLen) / 2;
}

/**
 * Scale joints by a factor (e.g., userThighLen / standardThighLen).
 */
export function scaleJoints(joints: JointData[], factor: number): JointData[] {
  return joints.map((j) => ({
    ...j,
    pos: {
      x: j.pos.x * factor,
      y: j.pos.y * factor,
      z: j.pos.z * factor,
    },
  }));
}

/**
 * Full normalization pipeline: relocate + scale.
 */
export function normalizeJoints(
  joints: JointData[],
  targetThighLength: number
): JointData[] {
  const relocated = relocateJoints(joints);
  const userThighLen = calcThighLength(relocated);
  const scale = userThighLen > 0 ? targetThighLength / userThighLen : 1;
  return scaleJoints(relocated, scale);
}

export function euclideanDistance(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Get the weight for a joint, defaulting to 1.0
 */
export function getJointWeight(jointId: string): number {
  return JOINTS[jointId]?.weight ?? 1.0;
}
