export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface JointData {
  id: string;
  pos: Vector3;
  rot?: Quaternion;
  velocity?: Vector3;
  acceleration?: Vector3;
  confidence: number;
}

export interface MotionFrameData {
  frameIndex: number;
  timestamp: number;
  joints: JointData[];
}

export interface MotionSequence {
  id: string;
  name: string;
  fps: number;
  frameCount: number;
  jointNames: string[];
  duration: number;
  frames: MotionFrameData[];
}

export interface JointDeviation {
  jointId: string;
  deviation: number;
  normalizedDeviation: number;
}

export interface FrameComparisonResult {
  timestamp: number;
  avgDeviation: number;
  maxDeviation: number;
  jointDeviations: JointDeviation[];
  score: number;
}

export interface BodyPartDeviation {
  bodyPart: string;
  avgDeviation: number;
  maxDeviation: number;
  severity: "low" | "medium" | "high";
}
