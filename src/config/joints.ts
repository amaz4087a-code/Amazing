export interface JointDefinition {
  id: string;
  label: string;
  group: BodyPartId;
  parent: string | null;
  weight: number;
}

export type BodyPartId =
  | "head"
  | "torso"
  | "left_arm"
  | "right_arm"
  | "left_leg"
  | "right_leg";

export interface BodyPartDefinition {
  name: string;
  joints: string[];
}

export const JOINTS: Record<string, JointDefinition> = {
  hip_center:     { id: "hip_center",     label: "骨盆中心", group: "torso",    parent: null,          weight: 1.0 },
  spine:          { id: "spine",          label: "脊柱",     group: "torso",    parent: "hip_center",  weight: 1.2 },
  chest:          { id: "chest",          label: "胸部",     group: "torso",    parent: "spine",       weight: 1.2 },
  neck:           { id: "neck",           label: "颈部",     group: "torso",    parent: "chest",       weight: 1.0 },
  head:           { id: "head",           label: "头部",     group: "head",     parent: "neck",        weight: 1.0 },

  left_shoulder:  { id: "left_shoulder",  label: "左肩",     group: "left_arm", parent: "chest",       weight: 1.3 },
  left_elbow:     { id: "left_elbow",     label: "左肘",     group: "left_arm", parent: "left_shoulder", weight: 1.3 },
  left_wrist:     { id: "left_wrist",     label: "左腕",     group: "left_arm", parent: "left_elbow",   weight: 1.1 },
  left_hand:      { id: "left_hand",      label: "左手",     group: "left_arm", parent: "left_wrist",   weight: 1.0 },

  right_shoulder: { id: "right_shoulder", label: "右肩",     group: "right_arm", parent: "chest",       weight: 1.3 },
  right_elbow:    { id: "right_elbow",    label: "右肘",     group: "right_arm", parent: "right_shoulder", weight: 1.3 },
  right_wrist:    { id: "right_wrist",    label: "右腕",     group: "right_arm", parent: "right_elbow",   weight: 1.1 },
  right_hand:     { id: "right_hand",     label: "右手",     group: "right_arm", parent: "right_wrist",   weight: 1.0 },

  left_hip:       { id: "left_hip",       label: "左髋",     group: "left_leg", parent: "hip_center",  weight: 1.4 },
  left_knee:      { id: "left_knee",      label: "左膝",     group: "left_leg", parent: "left_hip",     weight: 1.4 },
  left_ankle:     { id: "left_ankle",     label: "左踝",     group: "left_leg", parent: "left_knee",    weight: 1.2 },
  left_foot:      { id: "left_foot",      label: "左脚",     group: "left_leg", parent: "left_ankle",   weight: 1.0 },

  right_hip:      { id: "right_hip",      label: "右髋",     group: "right_leg", parent: "hip_center",  weight: 1.4 },
  right_knee:     { id: "right_knee",     label: "右膝",     group: "right_leg", parent: "right_hip",    weight: 1.4 },
  right_ankle:    { id: "right_ankle",    label: "右踝",     group: "right_leg", parent: "right_knee",   weight: 1.2 },
  right_foot:     { id: "right_foot",     label: "右脚",     group: "right_leg", parent: "right_ankle",  weight: 1.0 },
};

export const BODY_PARTS: Record<BodyPartId, BodyPartDefinition> = {
  head:      { name: "头部", joints: ["head", "neck"] },
  torso:     { name: "躯干", joints: ["chest", "spine", "hip_center"] },
  left_arm:  { name: "左臂", joints: ["left_shoulder", "left_elbow", "left_wrist", "left_hand"] },
  right_arm: { name: "右臂", joints: ["right_shoulder", "right_elbow", "right_wrist", "right_hand"] },
  left_leg:  { name: "左腿", joints: ["left_hip", "left_knee", "left_ankle", "left_foot"] },
  right_leg: { name: "右腿", joints: ["right_hip", "right_knee", "right_ankle", "right_foot"] },
};

export const SKELETON_BONES: [string, string][] = [
  ["hip_center", "spine"],
  ["spine", "chest"],
  ["chest", "neck"],
  ["neck", "head"],
  ["chest", "left_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["left_wrist", "left_hand"],
  ["chest", "right_shoulder"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["right_wrist", "right_hand"],
  ["hip_center", "left_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["left_ankle", "left_foot"],
  ["hip_center", "right_hip"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
  ["right_ankle", "right_foot"],
];

export const DEFAULT_BODY_PARTS: BodyPartId[] = [
  "head", "torso", "left_arm", "right_arm", "left_leg", "right_leg",
];

export type JointId = keyof typeof JOINTS;
